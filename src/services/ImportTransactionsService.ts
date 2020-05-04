import { In, getRepository, getCustomRepository } from 'typeorm';
import uploadConfig from '../config/upload';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

class ImportTransactionsService {
  async execute(csvFilePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const data = await uploadConfig.loadCSV(csvFilePath);

    const categoriesTitles = data.map(line => line[3]);

    const existentCategories = await categoriesRepository.find({
      where: { title: In(categoriesTitles) },
    });

    const newCategoriesTitles = categoriesTitles
      .filter(
        category => !existentCategories.some(({ title }) => title === category),
      )
      .filter((category, index, self) => self.indexOf(category) === index);

    const createdCategories = await categoriesRepository.create(
      newCategoriesTitles.map(category => ({ title: category })),
    );
    await categoriesRepository.save(createdCategories);

    const allCategories = [...existentCategories, ...createdCategories];

    const newTransactions = transactionsRepository.create(
      data.map(line => ({
        title: line[0],
        type: line[1],
        value: Number(line[2]),
        category: allCategories.find(category => category.title === line[3]),
      })),
    );

    const transactions = await transactionsRepository.save(newTransactions);

    return transactions;
  }
}

export default ImportTransactionsService;
