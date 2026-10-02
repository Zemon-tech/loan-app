// Ambient declarations for CSS imports used by the Expo template on web.
// Lets `import '@/global.css'` and `import classes from './x.module.css'` typecheck.
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
