import type { ChoiceIndex, ChoiceTuple } from './Protocol'

export interface WordCard {
  readonly answer: string
  readonly correctIndex: ChoiceIndex
  readonly choices: ChoiceTuple
}

function freezeCard(
  answer: string,
  correctIndex: ChoiceIndex,
  choices: ChoiceTuple,
): WordCard {
  return Object.freeze({
    answer,
    correctIndex,
    choices: Object.freeze([
      choices[0],
      choices[1],
      choices[2],
      choices[3],
    ]) as ChoiceTuple,
  })
}

export const WORD_DECK: readonly WordCard[] = Object.freeze([
  freezeCard('SNAKE', 0, ['SNAKE', 'RIVER', 'ROPE', 'WAVE']),
  freezeCard('SUN', 2, ['MOON', 'CLOCK', 'SUN', 'STAR']),
  freezeCard('HEART', 1, ['APPLE', 'HEART', 'CLOUD', 'FLOWER']),
  freezeCard('HOUSE', 3, ['BOX', 'MOUNTAIN', 'TENT', 'HOUSE']),
  freezeCard('FISH', 2, ['BIRD', 'LEAF', 'FISH', 'BOAT']),
  freezeCard('TREE', 1, ['PERSON', 'TREE', 'FORK', 'CACTUS']),
  freezeCard('STAR', 3, ['SUN', 'FLOWER', 'KITE', 'STAR']),
  freezeCard('WAVE', 2, ['SNAKE', 'RIVER', 'WAVE', 'MOUNTAIN']),
])
