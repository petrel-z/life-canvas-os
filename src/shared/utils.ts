import packageJson from '../../package.json'

const author =
  typeof packageJson.author === 'string'
    ? packageJson.author
    : (packageJson.author?.name ?? 'unknown')
const authorInKebabCase = author.replace(/\s+/g, '-')
const appId = `com.${authorInKebabCase}.${packageJson.name}`.toLowerCase()

/**
 * @param {string} id
 * @description Create the app id using the name and author from package.json transformed to kebab case if the id is not provided.
 * @default 'com.{author}.{app}' - the author and app comes from package.json
 * @example
 * makeAppId('com.example.app')
 * // => 'com.example.app'
 */
export function makeAppId(id: string = appId): string {
  return id
}

/**
 *
 * @param {number} ms
 * @description Wait for a given number of milliseconds.
 * @example
 * await waitFor(1000) // Waits for 1 second
 */
export function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
