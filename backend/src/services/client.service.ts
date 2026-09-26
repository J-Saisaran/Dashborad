import { prisma } from '../config/database.js';
import { CreateClientInput } from '../validators/client.validator.js';
import { NotFoundError } from '../utils/errors.js';

export class ClientService {
  async createClient(input: CreateClientInput) {
    return prisma.client.create({
      data: {
        name: input.name,
        email: input.email,
        company: input.company,
      },
    });
  }

  async getClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });
  }

  async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client not found', 'CLIENT_NOT_FOUND');
    }

    return client;
  }
}

export const clientService = new ClientService();
