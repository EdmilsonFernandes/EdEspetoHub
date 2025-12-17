import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './Store';

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

  @OneToOne(() => Store, (store) => store.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;
}
