import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './Store';
import { sanitizeSocialLinks, SocialLink } from '../utils/socialLinks';

@Entity({ name: 'store_settings' })
export class StoreSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ name: 'primary_color', default: '#b91c1c' })
  primaryColor!: string;

  @Column({ name: 'secondary_color', nullable: true })
  secondaryColor?: string;

  @Column({
    name: 'social_links',
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
    transformer: {
      to: (value?: SocialLink[] | null) => sanitizeSocialLinks(value ?? []),
      from: (value: SocialLink[] | null) => (Array.isArray(value) ? value : []),
    },
  })
  socialLinks?: SocialLink[];

  @OneToOne(() => Store, (store) => store.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;
}
