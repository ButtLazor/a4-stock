import styles from './styles.module.css';

export function cx(...names: Array<string | false | null | undefined>): string {
  return names
    .filter((name): name is string => Boolean(name))
    .map(name => styles[name] ?? name)
    .join(' ');
}

export { styles };
