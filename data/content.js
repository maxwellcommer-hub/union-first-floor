/* Everything the site says lives here. Text is taken from the deck (Union_L1_Final_Deck_V2).
   Positions are in deck page points on the "Nine zones" sheet (1920 x 1080), so they stay
   correct when the map image is rebuilt. */
window.UNION = {
  meta: {
    title: 'The First Floor',
    place: 'Kansas Union · Level 1',
    rooms: 'Hawk’s Nest · The Jay · The Cove',
    team: 'Team 3',
    date: 'Nov 6 2026',
    courses: 'VISC 426 · INDD 378 · ARCH 600',
    status: 'Design development'
  },

  entrance: [1482, 548],
  scaleLabel: [1797, 985],

  zones: [
    { n: 1, name: 'Campus history', note: 'start here', at: [1468.4, 344.1], hot: true },
    { n: 2, name: 'Order / pickup', at: [1029.3, 365.1] },
    { n: 3, name: 'Dining', at: [876.6, 310.3] },
    { n: 4, name: 'Lounge / watch party', at: [916.7, 173.0] },
    { n: 5, name: 'Donor walk', at: [1051.8, 478.2] },
    { n: 6, name: 'Chill / event', at: [1119.4, 734.9] },
    { n: 7, name: 'Bar', at: [1291.3, 408.0] },
    { n: 8, name: 'Conference pods', at: [911.7, 636.8] },
    { n: 9, name: 'Photo op', at: [1729.3, 524.1] }
  ],

  /* The walk, in deck order. cam = where the view is taken from, look = what it faces. */
  spaces: [
    { id: '01', title: 'The Mural', zone: 1, zoneLabel: 'Zone 1 · Campus history',
      cam: [1434.8, 506.9], look: [1556.2, 437.0],
      problem: 'No clear sign of welcoming.',
      build: [
        ['Rock Chalk mural', 'West face of the elevator core. Printed wall graphic, floor to ceiling.'],
        ['Hail to Old KU wrap', 'South face, same graphic system. Full height, faces the main lobby.'],
        ['Continuous corner', 'Graphic wraps the outside corner with no trim or reveal.']
      ],
      notes: 'Both faces run lobby floor to ceiling. Unfolded at the corner so both faces read at true size.',
      size: '29′-6″ wide · 10′-0″ to the ceiling' },

    { id: '02', title: 'Museum Wall', zone: 1, zoneLabel: 'Zone 1 · Campus history',
      cam: [1503.8, 367.5], look: [1502.9, 223.7],
      problem: 'The history is scattered.',
      build: [
        ['Open display box', 'Bento-style cubby, 1′-0″ deep, white. Holds one Union artifact each.'],
        ['Fluted infill panel', 'Light blue fluted panel fills the boxes that hold no object.'],
        ['Caption panel', 'KU colour story panel, title and short history text.'],
        ['Plinth', 'Painted base, full niche width.']
      ],
      notes: 'Boxes stack in 6 rows of 1′-0″. Box widths vary on a 3″ module. Set inside the lobby niche; nothing projects past the wall face.',
      size: '21′-6″ wide · 10′-0″ to the ceiling' },

    { id: '03', title: 'Order Wall', zone: 2, zoneLabel: 'Zone 2 · Order / pickup',
      cam: [1259.4, 281.5], look: [1122.4, 312.1],
      problem: 'The counter doesn’t invite anyone to stay.',
      build: [
        ['Order wall graphic', 'Printed graphic behind the counter, floor to ceiling, two panels.'],
        ['Order counter', 'White base, quartz top, 3′-6″ high.'],
        ['Kitchen door', 'Walnut leaf in a black steel frame.'],
        ['Arched opening', 'Arch wall in front of the counter, shown dashed.']
      ],
      notes: 'Graphic sits between the kitchen doors. Counter stands 1′-0″ clear of each door frame.',
      size: '40′-6″ wide · 10′-6″ to the ceiling',
      revenue: 1 },

    { id: '04', title: 'The Jay', zone: 4, zoneLabel: 'Zone 4 · Lounge / watch party',
      cam: [1029.5, 107.0], look: [1164.6, 144.7],
      problem: 'Bland, low and empty between bookings.' },

    { id: '05', title: 'Jay Games', zone: 4, zoneLabel: 'Zone 4 · Lounge / watch party',
      cam: [1121.3, 103.9], look: [992.7, 159.6],
      problem: 'No clear purpose.' },

    { id: '06', title: 'The Bar', zone: 7, zoneLabel: 'Zone 7 · Bar',
      cam: [1362, 432], look: [1262, 396],
      problem: 'Nothing brings people.' },

    { id: '07', title: 'Donor Walk', zone: 5, zoneLabel: 'Zone 5 · Donor walk',
      cam: [1017.4, 554.2], look: [1087.7, 432.5],
      problem: 'No reason to slow down.',
      build: [
        ['Donor rod', '3/4″ brushed steel rod, 3′-3″ above the ramp up to the ceiling.'],
        ['Name roll', '3″ dia. sleeve in KU yellow, red, navy or sky; donor name on the face. Roll sizes: 8″, 12″, 18″ and 24″.'],
        ['Rod spacing', '2′-0″ on centre along the curve.'],
        ['White strip', '1 1/2″ painted strip between rods, 3′-0″ above the ramp.']
      ],
      notes: 'West (outer) wall of the curved ramp. The east wall uses the same system. Heights taken from the ramp surface.',
      size: '7 @ 2′-0″ = 14′-0″ · ramp rises 1′-0″ over 14′-0″',
      revenue: 0 },

    { id: '08', title: 'The Pods', zone: 8, zoneLabel: 'Zone 8 · Conference pods',
      cam: [982.8, 661.1], look: [862.1, 589.4],
      problem: 'Nowhere on the floor to focus.' },

    { id: '09', title: 'The Terrace', zone: 0, zoneLabel: 'Outdoors · Baumgartner Terrace',
      cam: [940.5, 931.9], look: [991.3, 801.0],
      problem: 'The terrace is cut off.' },

    { id: '10', title: 'The Front', zone: 6, zoneLabel: 'Zone 6 · Chill / event',
      cam: [1225.5, 672.9], look: [1097.4, 615.6],
      problem: 'A pass-through, not a destination.',
      revenue: 2 },

    { id: '11', title: 'Window Decal', zone: 9, zoneLabel: 'Zone 9 · Photo op',
      cam: [1752.4, 505.9], look: [1716.3, 641.6],
      problem: 'No connection.',
      build: [
        ['Skyline decal', 'Printed window film on the inside face of the glass, 5′-0″ band.'],
        ['Corner wrap', 'Decal runs across the 9″ corner panel onto the straight glass.']
      ],
      notes: 'Heights taken from the stair landing. Glass continues up the stair tower.',
      size: '28′-3″ wide · curved glass shown unrolled' }
  ],

  /* "Built from the survey" persona, with his day placed on the floor. */
  persona: {
    name: 'Malik Turner',
    who: 'Junior · Business · Commutes from off campus',
    quote: 'I need somewhere between classes that isn’t the library and isn’t my car.',
    day: [
      { time: '11 AM', what: 'Coffee and a breakfast sandwich at the order wall.', space: '03' },
      { time: '1 PM', what: 'Plugs in at a pod to prep a group presentation.', space: '08' },
      { time: '4 PM', what: 'Ping pong at the Jay before his ride home.', space: '05' },
      { time: '8 PM', what: 'Some nights, back for a watch party or an open mic.', space: '04' }
    ],
    needs: ['Comfortable seats near an outlet.', 'Food and coffee without leaving the floor.', 'A reason to come back at night.']
  },

  survey: {
    responses: 22,
    lead: { n: 64, text: 'want comfortable lounge seating.' },
    stay: [['Comfortable lounge seating', 64], ['Plants and natural light', 45], ['Quiet study nooks', 41],
           ['Better food and coffee', 41], ['Late-night hangout hours', 36], ['Live music, open mics', 36]],
    block: [['Not enough outlets', 41], ['Feels empty, no energy', 36], ['Feels dated', 27],
            ['Seating', 23], ['Out of the way', 23]],
    stats: [[77, 'come in the afternoon'], [59, 'stop for food or a drink'], [41, 'are just passing through']]
  },

  vision: 'A place where Jayhawks discover their community.',
  principles: [
    ['Student and faculty driven', 'Built and sustained by students, powered by faculty and staff.',
     'Lounge, dining and pods come from what students asked for in the survey.'],
    ['Collaborative and communal', 'Channel the energy of campus.',
     'The watch party lounge and the chill / event floor hold groups, and can be rented.'],
    ['Uniquely KU', 'The first impression of the university, the campus living room.',
     'The campus history wall, the donor walk and the Jayhawk window.']
  ],
  intent: 'Creating an inviting space that encourages students to stay for longer periods. This space can be used for fun, work, or relaxation. There is also a historical element that unites KU’s history with the new students roaming the campus.',

  loudness: [
    ['Loudest', 'The lounge and watch party room, the bar, and the photo op at the stair.'],
    ['In between', 'Campus history and the ramp, where you slow down to read.'],
    ['Calmest', 'The conference pods in the southwest corner.']
  ],

  feel: [
    ['feel-game-room', 'A game room', 'The Jay'],
    ['feel-garage-door', 'A cafe with a glass garage door', 'The terrace doors'],
    ['feel-atrium', 'A daylit atrium', 'The lobby and stair'],
    ['feel-shade-sails', 'Shade sails over a plaza', 'The terrace canopy']
  ],
  furniture: [
    ['sit-jh600', 'Fritz Hansen', 'JH600'],
    ['sit-mell', 'COR', 'Mell bench'],
    ['sit-jalis', 'COR', 'Jalis Flow'],
    ['sit-reception', 'Icons of Denmark', 'Reception setting'],
    ['sit-mod', 'Boandko', 'Mod system'],
    ['sit-focus', 'Icons of Denmark', 'Focus setting']
  ],
  materials: [
    ['mat-plywood', 'Plywood', 'Interior'],
    ['mat-mesh', 'Knitted HDPE mesh', 'Canopy'],
    ['mat-perforated', 'Perforated wood', 'Pods'],
    ['mat-fabric', 'Fabric', 'Interior seating'],
    ['mat-dark-wood', 'Dark stained wood', 'Outdoors'],
    ['mat-steel', 'Dark steel beams', 'Outdoor accents'],
    ['mat-vinyl', 'Colored vinyl', 'Indoor wall accents']
  ],
  palette: [['KU Blue', '#0067B1'], ['Obsidian', '#142E54'], ['Sky Blue', '#74CCF3'],
            ['Smoke', '#5C707C'], ['Brick', '#8A171A'], ['Crimson', '#E01D39']],
  paletteNote: 'Blue leads, red sparingly, and the brick and limestone that are already there.',

  revenue: [
    ['Donor wall', 'Named gifts along the donor walk.', '07'],
    ['Lawrence cafe', 'A Lawrence-owned cafe at the order wall.', '03'],
    ['Stage rental', 'Rent the stage for events and game days.', '10']
  ]
};
