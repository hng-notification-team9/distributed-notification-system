import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Push {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bookId: string;

  @Column()
  customerId: string;

  @Column()
  quantity: number;

  @Column()
  totalPrice: number;
}