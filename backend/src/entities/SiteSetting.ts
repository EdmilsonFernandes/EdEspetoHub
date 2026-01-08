import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'site_settings' })
export class SiteSetting {
  @PrimaryColumn({ name: 'key', type: 'text' })
  key!: string;

  @Column({ name: 'value', type: 'text' })
  value!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
