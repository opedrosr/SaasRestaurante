/** Ilustração provisória usada enquanto o produto não tem foto. */
export function placeholderFor(name: string) {
  const n = name.toLowerCase();
  if (/(batata|onion|anéis|anel)/.test(n)) return '/placeholders/fries.svg';
  if (/(coca|guaraná|guarana|milkshake|suco|refri)/.test(n)) return '/placeholders/drink.svg';
  if (/(brownie|petit|gâteau|gateau)/.test(n)) return '/placeholders/dessert.svg';
  return '/placeholders/burger.svg';
}
