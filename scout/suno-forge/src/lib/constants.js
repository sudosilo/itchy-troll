export const GENRES = {
  band: ['Rock','Indie','Pop','Punk','Metal','Blues','Folk','Country','Soul','R&B','Hip-Hop','Jazz','Reggae','Shoegaze','Psychedelic'],
  edm:  ['Minimal EDM','Garage Techno','Breakbeat','Deep House','Acid Techno','Industrial','Drum & Bass','Jungle','Ambient','UK Garage','Trance','Dubstep','Footwork','EBM','Noise'],
  shared: ['Lo-fi','Analog','Cinematic','Dark','Atmospheric','Distorted','Layered Vocals','Raw Production'],
}

export const SECTION_TYPES = {
  band: ['Intro','Verse','Pre-Chorus','Chorus','Bridge','Outro','Instrumental','Breakdown','Solo'],
  edm:  ['Intro','Build','Drop','Breakdown','B-Section','Riser','Outro','Hook','Ad-lib'],
}

export const INSTRUMENT_OPTIONS = [
  '808 Bass','Kick Drum','Snare','Hi-Hat','Clap','Synth Lead','Synth Pad','Bassline',
  'Sub Bass','Chord Stab','Vocal Chop','Arp','Perc Loop','White Noise Sweep','Reese Bass',
  'Supersaw','FM Bell','Rhodes','Guitar Riff','String Section',
]

export const DEFAULT_DESCS = {
  Verse:       'Sparse arrangement, dry vocal, minimal percussion',
  Chorus:      'Full arrangement, layered vocals, driving beat',
  Bridge:      'Stripped back, tension builds, key shift',
  Intro:       'Atmospheric, slow build, no vocals',
  Outro:       'Fade out, reverb tail, minimal elements',
  Drop:        'Heavy bass, full compression, peak energy',
  Build:       'Rising filter, snare roll, tension mounting',
  Breakdown:   'Stripped percussion, melodic focus, breath space',
  'Pre-Chorus':'Building energy, syncopated, anticipation',
  Solo:        'Melodic lead, expressive, dynamic range',
  Riser:       'White noise, pitched upward, builds for 8 bars',
  Hook:        'Melodic motif, memorable, catchy',
  'B-Section': 'Contrasting melody, different groove, mid-energy',
  Instrumental:'No vocals, groove-focused, expressive instrumentation',
}

export const EXPAND_STRUCTURE = {
  band: ['Intro','Verse','Pre-Chorus','Chorus','Verse','Pre-Chorus','Chorus','Bridge','Chorus','Outro'],
  edm:  ['Intro','Build','Drop','Breakdown','Build','Drop','B-Section','Drop','Outro'],
}
