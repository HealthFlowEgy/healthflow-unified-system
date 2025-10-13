import { Request, Response } from 'express';
import { searchService } from '../services/searchService';

export const searchController = {
  async search(req: Request, res: Response) {
    try {
      const { q, type } = req.query;
      const results = await searchService.search(q as string, type as string);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  }
};
