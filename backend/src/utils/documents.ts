const onlyDigits = (value: string) => value.replace(/\D/g, '');

const isRepeated = (value: string) => /^(\d)\1+$/.test(value);

const validateCpf = (cpf: string) => {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || isRepeated(digits)) return false;
  const numbers = digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += numbers[i] * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== numbers[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += numbers[i] * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  return mod === numbers[10];
};

const validateCnpj = (cnpj: string) => {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14 || isRepeated(digits)) return false;
  const numbers = digits.split('').map(Number);
  const calc = (base: number[]) => {
    let sum = 0;
    let factor = 2;
    for (let i = base.length - 1; i >= 0; i -= 1) {
      sum += base[i] * factor;
      factor = factor === 9 ? 2 : factor + 1;
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const digit1 = calc(numbers.slice(0, 12));
  if (digit1 !== numbers[12]) return false;
  const digit2 = calc(numbers.slice(0, 13));
  return digit2 === numbers[13];
};

export const normalizeDocument = (value?: string) => (value ? onlyDigits(value) : '');

export const validateDocument = (value: string, type: string) => {
  const normalizedType = (type || '').toUpperCase();
  if (normalizedType === 'CPF') return validateCpf(value);
  if (normalizedType === 'CNPJ') return validateCnpj(value);
  return false;
};
