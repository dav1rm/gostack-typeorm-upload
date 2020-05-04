import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const balance = await transactionsRepository.getBalance();

    // Validations
    if (value <= 0) {
      throw new AppError('The value must be greater than 0', 401);
    }

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError("The type must be 'income' or 'outcome'", 401);
    }

    if (type === 'outcome' && balance.total < value) {
      throw new AppError('Your balance is insufficient to withdraw');
    }

    if (!category || category.trim() === '') {
      throw new AppError('The category cannot be empty', 401);
    }

    let categoryExists = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!categoryExists) {
      categoryExists = categoriesRepository.create({ title: category });
      await categoriesRepository.save(categoryExists);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: categoryExists,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
