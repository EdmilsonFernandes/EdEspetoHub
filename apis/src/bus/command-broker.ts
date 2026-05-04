import { Transporter } from './interfaces/transporter.interface';
export class CommandBroker {
    constructor(private readonly transporter: Transporter) {}
    public async start(): Promise<void> { await this.transporter.init(); }
    public async stop(): Promise<void> { if (this.transporter.destroy) await this.transporter.destroy(); }
}
