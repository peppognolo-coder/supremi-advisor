export function formatTitle(
  text?: string | null
) {

  if (!text) return '';

  return text
    .toLowerCase()
    .split(' ')
    .map((word) => {

      if (!word) return '';

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
      );
    })
    .join(' ');
}