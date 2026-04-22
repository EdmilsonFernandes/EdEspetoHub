import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { Condominium } from '../entities/Condominium';
import { CondominiumUser } from '../entities/CondominiumUser';

type SeedConfig = {
  slugHint: string;
  emailEnv: string;
  passwordEnv: string;
  nameEnv: string;
  fallbackName: string;
};

const seeds: SeedConfig[] = [
  {
    slugHint: 'azuli',
    emailEnv: 'AZULI_CONDO_EMAIL',
    passwordEnv: 'AZULI_CONDO_PASSWORD',
    nameEnv: 'AZULI_CONDO_NAME',
    fallbackName: 'Responsavel Campo Azuli',
  },
  {
    slugHint: 'milani',
    emailEnv: 'MILANI_CONDO_EMAIL',
    passwordEnv: 'MILANI_CONDO_PASSWORD',
    nameEnv: 'MILANI_CONDO_NAME',
    fallbackName: 'Responsavel Milani',
  },
];

async function main() {
  await AppDataSource.initialize();
  const condominiumRepo = AppDataSource.getRepository(Condominium);
  const userRepo = AppDataSource.getRepository(CondominiumUser);

  for (const seed of seeds) {
    const email = String(process.env[seed.emailEnv] || '').trim().toLowerCase();
    const password = String(process.env[seed.passwordEnv] || '').trim();
    const name = String(process.env[seed.nameEnv] || seed.fallbackName).trim();

    if (!email || !password) {
      console.log(`[condominium-users] Ignorando ${seed.slugHint}: informe ${seed.emailEnv} e ${seed.passwordEnv}.`);
      continue;
    }

    const condominium = await condominiumRepo
      .createQueryBuilder('condominium')
      .where('LOWER(condominium.slug) LIKE :slug', { slug: `%${seed.slugHint}%` })
      .orWhere('LOWER(condominium.name) LIKE :name', { name: `%${seed.slugHint}%` })
      .orderBy('condominium.name', 'ASC')
      .getOne();

    if (!condominium) {
      console.log(`[condominium-users] Condominio ${seed.slugHint} nao encontrado.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      existing.condominiumId = condominium.id;
      existing.name = name;
      existing.passwordHash = passwordHash;
      existing.role = 'CONDOMINIUM_ADMIN';
      existing.active = true;
      await userRepo.save(existing);
      console.log(`[condominium-users] Atualizado ${email} -> ${condominium.name}`);
      continue;
    }

    await userRepo.save(userRepo.create({
      condominiumId: condominium.id,
      name,
      email,
      passwordHash,
      role: 'CONDOMINIUM_ADMIN',
      active: true,
    }));
    console.log(`[condominium-users] Criado ${email} -> ${condominium.name}`);
  }

  await AppDataSource.destroy();
}

main().catch(async (error) => {
  console.error('[condominium-users] Falha ao criar usuarios de condominio:', error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
