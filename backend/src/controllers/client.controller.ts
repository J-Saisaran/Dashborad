import { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/client.service.js';

export class ClientController {
  async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.createClient(req.body);
      res.status(201).json({
        success: true,
        data: { client },
      });
    } catch (error) {
      next(error);
    }
  }

  async getClients(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await clientService.getClients();
      res.status(200).json({
        success: true,
        data: { clients },
      });
    } catch (error) {
      next(error);
    }
  }

  async getClientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.getClientById(req.params.id);
      res.status(200).json({
        success: true,
        data: { client },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();
