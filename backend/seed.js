const { sequelize, User, Client, Order, ProductionCompany } = require('./models');
const { hashPassword } = require('./utils/hash');

async function seedDatabase() {
  try {
    console.log('🔄 Синхронизация БД...');
    await sequelize.sync({ alter: true });
    console.log('✅ БД синхронизирована');

    // Проверка наличия данных
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log('⚠️  БД уже содержит данные. Пропуск заполнения.');
      process.exit(0);
    }

    console.log('🚀 Заполнение БД тестовыми данными...');

    // Создание админа
    const admin = await User.create({
      fullName: 'Администратор',
      email: 'admin@revolution.print',
      passwordHash: await hashPassword('admin123'),
      role: 'admin',
      active: true
    });
    console.log('✅ Админ создан:', admin.email);

    // Создание менеджеров
    const manager1 = await User.create({
      fullName: 'Иван Иванов',
      email: 'ivan@revolution.print',
      passwordHash: await hashPassword('password123'),
      role: 'manager',
      active: true
    });

    const manager2 = await User.create({
      fullName: 'Петр Петров',
      email: 'petr@revolution.print',
      passwordHash: await hashPassword('password123'),
      role: 'manager',
      active: true
    });
    console.log('✅ Менеджеры созданы');

    // Создание производства
    const productionUser = await User.create({
      fullName: 'Оператор производства',
      email: 'production@revolution.print',
      passwordHash: await hashPassword('password123'),
      role: 'production',
      active: true
    });
    console.log('✅ Оператор производства создан');

    // Создание клиентов
    const client1 = await Client.create({
      userId: manager1.id,
      name: 'ООО "Рога и Копыта"',
      status: 'Новый',
      owner: 'Петр Козлов',
      firstCall: new Date(),
      comment: 'Перспективный клиент'
    });

    const client2 = await Client.create({
      userId: manager1.id,
      name: 'ИП "Сладкая жизнь"',
      status: 'В работе',
      owner: 'Анна Сладкова',
      firstCall: new Date('2024-01-15'),
      comment: 'Постоянный клиент'
    });

    const client3 = await Client.create({
      userId: manager2.id,
      name: 'АО "Металлург"',
      status: 'В ожидании',
      owner: 'Сергей Стальнов',
      firstCall: new Date('2024-01-01'),
      comment: 'Ждём КП'
    });
    console.log('✅ Клиенты созданы');

    // Создание заказов
    const order1 = await Order.create({
      userId: manager1.id,
      clientId: client1.id,
      title: 'Печать буклетов',
      status: 'В работе',
      notes: 'Срочный заказ, нужно готово к пятнице',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentStatus: '50%',
      marginPercent: 25
    });

    const order2 = await Order.create({
      userId: manager1.id,
      clientId: client2.id,
      title: 'Упаковка для конфет',
      status: 'Обработка',
      notes: 'Уточнить размеры коробки',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      paymentStatus: 'postpaid',
      marginPercent: 30
    });

    const order3 = await Order.create({
      userId: manager2.id,
      clientId: client3.id,
      title: 'Бланки и сметы',
      status: 'Готов',
      notes: 'Заказ выполнен',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentStatus: 'paid',
      marginPercent: 20
    });
    console.log('✅ Заказы созданы');

    // Создание компаний производства
    const production1 = await ProductionCompany.create({
      userId: manager1.id,
      name: 'Типография "Качество"',
      info: 'Полиграфические услуги',
      cooperation: 'договор',
      contactPerson: 'Максим Печатов',
      phone: '+7 (999) 123-45-67',
      email: 'contact@kachestvo.print'
    });

    const production2 = await ProductionCompany.create({
      userId: manager2.id,
      name: 'Студия дизайна "Креатив"',
      info: 'Графический дизайн и верстка',
      cooperation: 'договор',
      contactPerson: 'Ольга Дизайнова',
      phone: '+7 (999) 234-56-78',
      email: 'info@creative.studio'
    });
    console.log('✅ Компании производства созданы');

    console.log('\n✨ БД успешно заполнена!\n');
    console.log('📝 Тестовые учетные данные:');
    console.log('   Admin:        admin@revolution.print / admin123');
    console.log('   Manager 1:    ivan@revolution.print / password123');
    console.log('   Manager 2:    petr@revolution.print / password123');
    console.log('   Production:   production@revolution.print / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при заполнении БД:', error);
    process.exit(1);
  }
}

seedDatabase();
