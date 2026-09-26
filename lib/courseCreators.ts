import { creators } from '@/data/creators'

export function attachCreatorToCourse<T extends object>(course: T) {
  return {
    ...course,
    creator: creators[0], // always Samuel for now
  }
}
