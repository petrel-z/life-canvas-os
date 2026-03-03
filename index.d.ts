/// <reference types="vite/client" />

declare module '*/package.json' {
  export const name: string
  export const version: string
  export const description: string
  export const displayName: string
  export const main: string
  export const resources: string
  export const author: { name: string } | string
  export const license: string
  
  const packageJson: {
    name: string
    version: string
    description: string
    displayName: string
    main: string
    resources: string
    author: { name: string } | string
    license: string
    [key: string]: any
  }
  
  export default packageJson
}
