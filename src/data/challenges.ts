export interface Challenge {
  day: string
  name: string
  description: string
}

export const challenges: Challenge[] = [
  { day: '01', name: 'Points', description: 'A map challenge classic. Map with points.' },
  { day: '02', name: 'Lines', description: 'A map challenge classic. Map with lines.' },
  { day: '03', name: 'Polygons', description: 'A map challenge classic. Map with polygons.' },
  {
    day: '04',
    name: 'Clusters',
    description: 'Clusters of something. Hotspots, groups, things that gather together.',
  },
  { day: '05', name: 'Senses: Sight', description: 'How do you see something? Maybe map a viewshed?' },
  {
    day: '06',
    name: 'Vintage',
    description:
      'Spin up your time machine and do a map which looks like a historical map, or maybe the theme itself should be vintage.',
  },
  { day: '07', name: '10 minute map', description: 'You have no more than 10 minutes to complete this map.' },
  { day: '08', name: 'Utopia', description: 'A map of something which could be.' },
  { day: '09', name: 'Urban-rural', description: 'Urban or rural. Cities and countryside.' },
  {
    day: '10',
    name: 'Prompting only',
    description:
      'For this map, make AI work for its money and produce something from start to finish in a chat window or on the command line.',
  },
  {
    day: '11',
    name: 'Senses: Sound',
    description: 'How do you hear something? How do you map a soundscape? Noise pollution mapped?',
  },
  {
    day: '12',
    name: 'Power',
    description:
      'Power as in nuclear power? Or physical power or influence? Power grid on a map? Read this the way you want, like every other prompt.',
  },
  {
    day: '13',
    name: 'Interactions',
    description: 'Interactions between things, or maybe the result would be an interactive map?',
  },
  {
    day: '14',
    name: 'Borgesian map',
    description: "A map so detailed it becomes the territory. Inspired by Borges' On Exactitude in Science.",
  },
  {
    day: '15',
    name: 'Inside out',
    description: 'Inside out, upside down. Something on this map is not quite right.',
  },
  {
    day: '16',
    name: 'Collaborative map',
    description: "Do a map with a friend, colleague or a stranger. AI doesn't count as a friend :)",
  },
  {
    day: '17',
    name: 'Light & dark',
    description: 'Play with visual effects. What can you map with just light and shadows?',
  },
  { day: '18', name: 'NULL', description: '' },
  {
    day: '19',
    name: 'Senses: Smell',
    description: 'How do you map things which your nose can sense? What does a smelly map look like?',
  },
  { day: '20', name: 'Hexagons', description: 'Hexagons, the good old bestagons.' },
  {
    day: '21',
    name: 'OpenStreetMap',
    description: 'The awesome data source for mapping. You can also use this day to edit OSM.',
  },
  {
    day: '22',
    name: 'Projections',
    description:
      'The different ways of representing a globe on a flat surface. What does your favourite map projection say about you?',
  },
  { day: '23', name: 'Senses: Taste', description: 'Food, drink or something else which you can taste.' },
  {
    day: '24',
    name: 'Network',
    description: 'Route network, transit network, human network or something completely different.',
  },
  {
    day: '25',
    name: 'Is this a map?',
    description:
      'Stretch the limits of maps and blend your map with an artwork or some creative data visualization. When does something become a map and when does it stop being one?',
  },
  { day: '26', name: 'Water', description: "About 71% of the Earth's surface. That wet thing, you know?" },
  {
    day: '27',
    name: 'New tool',
    description:
      'The challenge has always been about learning things. Try out a new tool in your mapmaking workflow.',
  },
  {
    day: '28',
    name: 'Senses: Feeling',
    description: 'The most abstract of the senses series. How would you map a feeling?',
  },
  { day: '29', name: 'Raster', description: 'Do something cool with pixels.' },
  {
    day: '30',
    name: 'Pen & paper',
    description:
      'Time to wrap up the challenge by closing your laptop for a while and going back to basics. Do an analogue map with pen and paper.',
  },
]

export function getChallenge(day: string): Challenge | undefined {
  return challenges.find((challenge) => challenge.day === day)
}

export function getChallengeDate(day: string): string {
  return `${day} November 2026`
}

export function getCurrentChallenge(now = new Date()): Challenge | undefined {
  if (now.getFullYear() !== 2026 || now.getMonth() !== 10 || now.getDate() < 1 || now.getDate() > 30) {
    return undefined
  }

  return getChallenge(String(now.getDate()).padStart(2, '0'))
}
