// A Canticle for Pajamastan engine, quest script module, version one.
// Built from a-canticle-for-pajamastan-v1-spec-script.md.
// Plain text scripts, one instruction per line. A label is a word ending in a colon. A hash starts a comment.
// Registers are written r0 through r255. Event flags are written f0 through f1023. Text in double quotes is one argument.
//
// Core opcodes:
//   set rX v | add rX v | sub rX v | mul rX v | div rX v | mod rX v | rand rX lo hi
//   jmp label | if a op b label   (op is == != < <= > >=) | call label | ret
//   wait seconds | waitflag fX | flag fX | unflag fX | ifflag fX label
//   on event label   (register a handler, event names are free text) | end | success | fail
// Game opcodes are passed to host.op(name, args, vm), for example:
//   msg "text" | choice rX "a" "b" | give "item" n | coin n | spawn "kind" x y | door "id" lock|unlock
//   warp floor | timer seconds | music "name" | rule key value | camera x y | sound "name"
(function (root) {
  var C = root.Canticle = root.Canticle || {};
  var CORE = ['set', 'add', 'sub', 'mul', 'div', 'mod', 'rand', 'jmp', 'if', 'call', 'ret', 'wait', 'waitflag', 'flag', 'unflag', 'ifflag', 'on', 'end', 'success', 'fail'];

  function tokenize(line) {
    var out = [], re = /"([^"]*)"|(\S+)/g, m;
    while ((m = re.exec(line))) out.push(m[1] !== undefined ? { s: m[1] } : m[2]);
    return out;
  }

  function parse(text) {
    var code = [], labels = {}, errors = [];
    text.split(/\r?\n/).forEach(function (raw, n) {
      var line = raw.replace(/#.*$/, '').trim();
      if (!line) return;
      var toks = tokenize(line);
      while (toks.length && typeof toks[0] === 'string' && /:$/.test(toks[0])) { labels[toks.shift().slice(0, -1)] = code.length; }
      if (!toks.length) return;
      code.push({ op: String(toks[0]).toLowerCase(), args: toks.slice(1), line: n + 1 });
    });
    code.forEach(function (ins) {
      var needs = { jmp: 0, call: 0, if: 3, ifflag: 1, on: 1 }[ins.op];
      if (needs !== undefined && !(ins.args[needs] in labels)) errors.push('line ' + ins.line + ': unknown label ' + ins.args[needs]);
    });
    return { code: code, labels: labels, errors: errors };
  }

  function createVM(program, host) {
    host = host || {};
    var vm = { regs: new Array(256).fill(0), flags: {}, threads: [], handlers: {}, log: [], done: null, program: program, rules: {} };
    function val(a) {
      if (a && typeof a === 'object') return a.s;
      if (/^r\d+$/.test(a)) return vm.regs[+a.slice(1)];
      if (/^f\d+$/.test(a)) return vm.flags[+a.slice(1)] ? 1 : 0;
      var n = Number(a); return isNaN(n) ? a : n;
    }
    function reg(a) { return +String(a).slice(1); }
    function flag(a) { return +String(a).slice(1); }
    function spawn(label, args) {
      if (!(label in program.labels)) return null;
      var th = { pc: program.labels[label], stack: [], wait: 0, waitFlag: null, alive: true, args: args || [] };
      vm.threads.push(th); return th;
    }
    vm.start = function (label) { return spawn(label || 'start'); };
    vm.emit = function (event, args) {
      var label = vm.handlers[event];
      if (label === undefined) return false;
      var th = spawn(label, args);
      if (th && args) args.forEach(function (v, i) { vm.regs[250 + i] = v; });
      return !!th;
    };
    vm.setReg = function (i, v) { vm.regs[i] = v; };
    vm.tick = function (dt) {
      var budget = 2000;
      vm.threads.forEach(function (th) {
        if (!th.alive) return;
        if (th.wait > 0) { th.wait -= dt; if (th.wait > 0) return; th.wait = 0; }
        if (th.waitFlag !== null) { if (!vm.flags[th.waitFlag]) return; th.waitFlag = null; }
        if (th.block) { if (th.block()) return; th.block = null; }
        while (th.alive && budget-- > 0) {
          var ins = program.code[th.pc];
          if (!ins) { th.alive = false; break; }
          th.pc++;
          var a = ins.args, stop = false;
          switch (ins.op) {
            case 'set': vm.regs[reg(a[0])] = val(a[1]); break;
            case 'add': vm.regs[reg(a[0])] += val(a[1]); break;
            case 'sub': vm.regs[reg(a[0])] -= val(a[1]); break;
            case 'mul': vm.regs[reg(a[0])] *= val(a[1]); break;
            case 'div': vm.regs[reg(a[0])] = val(a[1]) ? Math.trunc(vm.regs[reg(a[0])] / val(a[1])) : 0; break;
            case 'mod': vm.regs[reg(a[0])] = val(a[1]) ? vm.regs[reg(a[0])] % val(a[1]) : 0; break;
            case 'rand': vm.regs[reg(a[0])] = val(a[1]) + Math.floor((host.rand || Math.random)() * (val(a[2]) - val(a[1]) + 1)); break;
            case 'jmp': th.pc = program.labels[a[0]]; break;
            case 'if': {
              var x = val(a[0]), y = val(a[2]), op = a[1], ok = false;
              if (op === '==') ok = x == y; else if (op === '!=') ok = x != y; else if (op === '<') ok = x < y;
              else if (op === '<=') ok = x <= y; else if (op === '>') ok = x > y; else if (op === '>=') ok = x >= y;
              if (ok) th.pc = program.labels[a[3]];
              break;
            }
            case 'call': th.stack.push(th.pc); th.pc = program.labels[a[0]]; break;
            case 'ret': if (th.stack.length) th.pc = th.stack.pop(); else th.alive = false; break;
            case 'wait': th.wait = val(a[0]); stop = true; break;
            case 'waitflag': if (!vm.flags[flag(a[0])]) { th.waitFlag = flag(a[0]); stop = true; } break;
            case 'flag': vm.flags[flag(a[0])] = true; break;
            case 'unflag': delete vm.flags[flag(a[0])]; break;
            case 'ifflag': if (vm.flags[flag(a[0])]) th.pc = program.labels[a[1]]; break;
            case 'on': vm.handlers[val(a[0])] = a[1]; break;
            case 'end': th.alive = false; break;
            case 'success': vm.done = 'success'; vm.log.push('quest success'); if (host.op) host.op('success', [], vm); th.alive = false; break;
            case 'fail': vm.done = 'fail'; vm.log.push('quest failed'); if (host.op) host.op('fail', [], vm); th.alive = false; break;
            default: {
              var vals = a.map(val);
              if (ins.op === 'rule') vm.rules[vals[0]] = vals[1];
              vm.log.push(ins.op + (vals.length ? ' ' + vals.join(' ') : ''));
              var res = host.op ? host.op(ins.op, vals, vm, th, a) : undefined;
              if (typeof res === 'function') { th.block = res; stop = true; }
            }
          }
          if (stop) break;
        }
      });
      vm.threads = vm.threads.filter(function (th) { return th.alive; });
      return vm.threads.length;
    };
    return vm;
  }

  var api = { CORE: CORE, parse: parse, createVM: createVM };
  C.script = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
