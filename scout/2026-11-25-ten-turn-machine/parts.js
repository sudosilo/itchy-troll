// Ten Turn Machine tiles. A tile takes the ball in moving one way (its r) and sends it out.
// out turns the ball: -1 left, 0 straight, 1 right. dz changes height in levels.
const DX=[0,1,0,-1],DY=[-1,0,1,0];
const TILES={
 flat:{n:"Flat track",out:0,dz:0,c:"#6b7280"},
 ramp:{n:"Ramp down",out:0,dz:-1,c:"#b07a3a"},
 drop:{n:"Funnel drop",out:0,dz:-2,c:"#7a5cff"},
 left:{n:"Curve left",out:-1,dz:0,c:"#2f72c9"},
 right:{n:"Curve right",out:1,dz:0,c:"#2f72c9"},
 spring:{n:"Spring",out:0,dz:2,c:"#2e9a52"},
 fan:{n:"Fan",out:0,dz:1,c:"#2a7f87"},
 bell:{n:"Bell",out:0,dz:0,c:"#c07a12"},
 dominoes:{n:"Dominoes",out:0,dz:0,c:"#b4442c"},
 goal:{n:"Goal cup",out:0,dz:0,c:"#e8590c",end:true}
};
// Each turn deals one card. Only parts placed that turn that the ball reaches count.
const CARDS=[
 ["Ring the bell",s=>s.k.includes("bell")],
 ["Launch it with a spring",s=>s.k.includes("spring")],
 ["Send the ball uphill",s=>s.dz>0],
 ["Take it lower",s=>s.dz<0],
 ["Make a turn",s=>s.k.includes("left")||s.k.includes("right")],
 ["Knock over dominoes",s=>s.k.includes("dominoes")],
 ["No flat track",s=>s.k.length>0&&!s.k.includes("flat")],
 ["Blow it with a fan",s=>s.k.includes("fan")],
 ["Every part different",s=>s.k.length>1&&new Set(s.k).size===s.k.length],
 ["Drop it through the funnel",s=>s.k.includes("drop")],
 ["Use all three parts",s=>s.k.length>=3]
];
