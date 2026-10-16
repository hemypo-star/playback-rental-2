# Graph Report - playback-rental  (2026-10-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2151 nodes · 4227 edges · 314 communities (119 shown, 195 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 193 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c36853d7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Отправка заказа в МойСклад
- Настройки сайта и данные
- Форма контакта и тесты
- Даты аренды и корзина
- Промоакции и карточки товара
- Конфиг Payload и склад
- Каталог витрины
- Синхронизация с МойСклад
- SEO и страница товара
- Пользователи админки
- Миграции базы данных
- Корневые макеты
- Список и карточка акций
- Визуальная регрессия
- Вход и первая регистрация
- Данные товаров и DEV-LOG
- Форма акции
- Клиенты и счётчики меню
- Данные наборов
- Календарь занятости
- Страница оформления заказа
- Демон уведомлений
- Форма категории
- Ручной заказ
- Аналитика и KPI
- Очередь уведомлений
- Форма ручного заказа
- Слот изображения (дизайн)
- Категории и склад в админке
- Аудит легаси-приложения
- Общие остатки и доступность
- Форма набора
- npm-скрипты приложения
- Форма товара
- Страница поиска и sitemap
- Разовый перенос легаси
- Карточка заказа в админке
- Главная страница
- Страница товара витрины
- Каналы мессенджеров
- Dev-зависимости
- Сиды и обслуживание медиа
- Сверка легаси-товаров
- Выбор дат на витрине
- Инструкция: порядок работ
- Оформление заказа на сервере
- Рантайм бандла дизайна
- Skill graphify
- Smoke: промокоды
- Шапка и поиск витрины
- Форматирование уведомлений
- Аудит: деньги и даты
- Аудит: админка
- Промокоды в админке
- Настройки TypeScript
- Аудит: оформление
- Зависимости cms
- Поиск по каталогу
- Сохранение настроек сайта
- Рабочие инструкции ассистента
- Браузерные smoke-тесты
- Анимации дизайна
- Runtime-зависимости
- README: для разработчика
- Карточка товара в админке
- Расчёт цены аренды
- Smoke: комплекты
- Сид smoke-данных
- README: запуск и выкладка
- Аудит: каталог
- Конфиг ESLint
- Статус остатка
- Сертификаты
- Юридические страницы
- Отправка писем SMTP
- Синхронизация дизайна
- Списки заказов и наборов
- Smoke: лимиты и вход
- Примитивы дизайна
- Лимиты запросов и пользователи
- Сид визуальных данных
- Токены дизайна
- Медиатека в админке
- Доступность в каталоге
- Скрипт превью
- API Payload и Next-конфиг
- Smoke: аналитика
- Аудит живого приложения
- Smoke: запуск
- План визуального паритета
- Ручной smoke-чеклист 2.0
- Корневой package.json
- Smoke: данные админки
- Smoke: публичная безопасность
- Smoke: жизненный цикл заказа
- Скрипт релиза
- Конфиг PostCSS
- Запуск на хостинге
- Остановка превью
- План миграции на Next
- Экраны дизайна
- План работ дизайна
- Текущий план выполнения
- graphify: экспорты
- Дизайн-аудит 2.0
- README проекта
- Прямые уведомления на VDS
- План кастомной админки
- Рабочие заметки CLAUDE.md
- README дизайн-хэндоффа
- Иерархия категорий
- Кастомная админка: решения
- Инструкция для агента
- Бесплатный превью-хостинг
- Выгрузка дизайна
- Бэклог фич
- Агент-ревьюер кода
- Агент-тестировщик
- graphify: запросы
- Агент выкладки
- Мониторинг ошибок
- Локальный превью
- README приложений
- Агент-ревьюер миграций
- Агент-летописец роадмапа
- graphify: add и watch
- graphify: хуки
- graphify: обновление
- graphify: клон репозиториев
- graphify: транскрипция
- Локальный CLAUDE.md
- graphify: спецификация извлечения
- Дизайн-референс

## God Nodes (most connected - your core abstractions)
1. `next` - 84 edges
2. `payload` - 78 edges
3. `Playback Rental 2.0 — dev log` - 61 edges
4. `mediaUrl()` - 43 edges
5. `react` - 40 edges
6. `AdminPageHeader()` - 39 edges
7. `getAdminUser()` - 35 edges
8. `scripts` - 34 edges
9. `ImageSlot` - 27 edges
10. `get()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Feature backlog: porting `origin/claude/category-editing-hierarchy-im9cfz` into `2.0`` --references--> `AdminOrdersFilters`  [INFERRED]
  docs/ROADMAP-2.0.md → apps/cms/src/lib/admin/data/orders.ts
- `Playback Rental 2.0 — dev log` --references--> `DateSelection`  [INFERRED]
  docs/DEV-LOG.md → apps/cms/src/stores/dates.ts
- `Куда это встроить` --references--> `audit()`  [INFERRED]
  docs/DESIGN-SYNC.md → tools/design-sync.mjs
- `Что показал `audit` на текущем коде` --references--> `audit()`  [INFERRED]
  docs/DESIGN-SYNC.md → tools/design-sync.mjs
- `Unplanned work found in the code, not in any plan` --references--> `audit()`  [INFERRED]
  docs/ROADMAP-2.0.md → tools/design-sync.mjs

## Import Cycles
- None detected.

## Communities (314 total, 195 thin omitted)

### Community 0 - "Отправка заказа в МойСклад"
Cohesion: 0.08
Nodes (34): onRequestError, register(), buildOrderDescription(), businessDate(), DescriptionInput, DescriptionLine, expandKitLine(), isSyntheticMoySkladId() (+26 more)

### Community 3 - "Настройки сайта и данные"
Cohesion: 0.09
Nodes (23): SECTIONS, dynamic, AdminSettingsPage(), dynamic, metadata, CheckoutRoutePage(), dynamic, metadata (+15 more)

### Community 5 - "Форма контакта и тесты"
Cohesion: 0.13
Nodes (10): contactNotificationEndpoint, all, counts, CONTACT_LIMITS, CONTACT_MAX_BODY_BYTES, ContactInput, ContactInputResult, field() (+2 more)

### Community 7 - "Даты аренды и корзина"
Cohesion: 0.15
Nodes (19): CartActionsInit(), PrototypeAddButton(), isoDay(), PrototypeFreeToggle(), PrototypeProductCardData, DEFAULT_CLASSES, IN_CART_CLASSES, initCartActions() (+11 more)

### Community 8 - "Промоакции и карточки товара"
Cohesion: 0.17
Nodes (17): dynamic, generateMetadata(), PromotionPage(), Props, ProductCard(), Props, PromoCarousel(), PromoSlide (+9 more)

### Community 9 - "Конфиг Payload и склад"
Cohesion: 0.09
Nodes (17): Categories, Media, Products, PromoCodes, Promotions, SiteSettings, AdminStockFilters, AdminStockRow (+9 more)

### Community 10 - "Каталог витрины"
Cohesion: 0.21
Nodes (16): CatalogIndexPage(), dynamic, metadata, CategoryPage(), dynamic, generateMetadata(), Props, buildCatalogUrl() (+8 more)

### Community 11 - "Синхронизация с МойСклад"
Cohesion: 0.06
Nodes (53): moyskladWebhookEndpoint, MsWebhookBody, MsWebhookEvent, getToken(), msGet(), msGetBinary(), MsListResponse, msPaginate() (+45 more)

### Community 12 - "SEO и страница товара"
Cohesion: 0.16
Nodes (15): dynamic, faq, metadata, pricing, steps, dynamic, generateMetadata(), load() (+7 more)

### Community 13 - "Пользователи админки"
Cohesion: 0.24
Nodes (14): ActionResult, changeOwnPassword(), createUser(), CreateUserResult, deleteUser(), errorMessage(), requireAdmin(), AdminUsersPage() (+6 more)

### Community 15 - "Корневые макеты"
Cohesion: 0.16
Nodes (14): AdminLayout(), dynamic, metadata, metadata, RootLayout(), OrderStatusCell(), TONE, EntryAnimationController() (+6 more)

### Community 16 - "Список и карточка акций"
Cohesion: 0.21
Nodes (10): AdminPromotionDetailPage(), dynamic, generateMetadata(), loadPromotion(), Props, AdminPromotionsPage(), dynamic, metadata (+2 more)

### Community 17 - "Визуальная регрессия"
Cohesion: 0.13
Nodes (33): adminCookies(), applyCookies(), baselineDir, capture(), CdpSession, compare(), discoverVisualProducts(), evaluate() (+25 more)

### Community 18 - "Вход и первая регистрация"
Cohesion: 0.20
Nodes (13): AdminFirstRegisterPage(), dynamic, metadata, AdminLoginPage(), dynamic, metadata, Props, safeNextPath() (+5 more)

### Community 19 - "Данные товаров и DEV-LOG"
Cohesion: 0.24
Nodes (16): buildProductWhere(), CategoryProductStats, getAccessoryProducts(), GetAccessoryProductsParams, getCategoryProductCountEntriesCached, getCategoryProductCounts(), getCategoryProductStatEntriesCached, getCategoryProductStats() (+8 more)

### Community 20 - "Форма акции"
Cohesion: 0.26
Nodes (11): ActionResult, deletePromotion(), errorMessage(), PromotionInput, requireAdmin(), savePromotion(), ImageDropzone(), Props (+3 more)

### Community 23 - "Клиенты и счётчики меню"
Cohesion: 0.21
Nodes (11): AdminClientsPage(), dynamic, initials(), metadata, AdminClientRow, getAdminClients(), getAdminKpi(), AdminNavBadges (+3 more)

### Community 25 - "Данные наборов"
Cohesion: 0.22
Nodes (12): AdminKitEditPage(), dynamic, generateMetadata(), loadKit(), Props, POST(), AdminKitRow, getKitById() (+4 more)

### Community 26 - "Календарь занятости"
Cohesion: 0.11
Nodes (29): AdminCalendarPage(), dynamic, LEGEND, metadata, parseOffset(), Props, THEME, CalendarGrid() (+21 more)

### Community 29 - "Страница оформления заказа"
Cohesion: 0.26
Nodes (13): pluralUnits(), translateCheckoutError(), phone(), Promo, PrototypeCheckout(), $cartCount, $cartTotal, clearCart() (+5 more)

### Community 30 - "Демон уведомлений"
Cohesion: 0.21
Nodes (14): ensureNotificationQueue(), atomicWrite(), cleanupCompletedJobs(), main(), pollMs, processJob(), recoverProcessing(), retentionDays (+6 more)

### Community 31 - "Форма категории"
Cohesion: 0.28
Nodes (10): ActionResult, CategoryInput, deleteCategory(), errorMessage(), requireAdmin(), saveCategory(), CategoryForm(), Props (+2 more)

### Community 32 - "Ручной заказ"
Cohesion: 0.28
Nodes (8): CreateManualOrderResult, createManualOrder(), ManualOrderError, ManualOrderInput, ManualOrderItemInput, resolveActivePromoCode(), kitAndComponentInOneOrder(), main()

### Community 33 - "Аналитика и KPI"
Cohesion: 0.13
Nodes (21): AdminAnalyticsPage(), displayDate(), dynamic, metadata, Props, AdminKpiCards(), rub(), AnalyticsDateRange (+13 more)

### Community 34 - "Очередь уведомлений"
Cohesion: 0.16
Nodes (15): buildNotificationDeliveries(), enqueueNotification(), NotificationQueueResult, notificationQueueRoot(), smtpEnabled(), payload, NotificationDeliveryKind, NotificationDeliveryStatus (+7 more)

### Community 36 - "Форма ручного заказа"
Cohesion: 0.23
Nodes (10): createManualOrderAction(), dynamic, metadata, NewAdminOrderPage(), emptyRow(), ItemRow, ManualOrderForm(), ProductOption (+2 more)

### Community 37 - "Слот изображения (дизайн)"
Cohesion: 0.13
Nodes (7): flushNow(), getSlot(), ImageSlot, load(), save(), setSlot(), toDataUrl()

### Community 39 - "Категории и склад в админке"
Cohesion: 0.14
Nodes (23): AdminCategoryDetailPage(), dynamic, generateMetadata(), loadCategory(), Props, AdminCategoriesPage(), dynamic, metadata (+15 more)

### Community 40 - "Аудит легаси-приложения"
Cohesion: 0.07
Nodes (27): 06 — Аудит легаси-приложения (архив), 10. 🟡 Фильтры живут в `location.state`, а не в URL, 11. 🔴 Валидация формы работает через перехват кликов по тексту кнопки, 12. 🔴 Нет согласия на обработку персональных данных, 13. 🟠 Состав полей и автозаполнение, 15. 🟠 Четыре точки входа в админку, 16. 🟠 Оператор не видит заявку целиком, 17. 🟡 Нет поиска, фильтров и клавиатуры в таблицах (+19 more)

### Community 41 - "Общие остатки и доступность"
Cohesion: 0.07
Nodes (51): canCreateOrderItem(), canModifyOrderItem(), hasValidSubmitToken(), OrderItems, recalcOrderTotal(), toId(), OrderItemsWithLifecyclePolicy, OrdersWithLifecyclePolicy (+43 more)

### Community 42 - "Форма набора"
Cohesion: 0.30
Nodes (10): deleteKit(), KitActionResult, KitInput, requireAdmin(), saveKit(), ImageItem, KitForm(), Props (+2 more)

### Community 44 - "npm-скрипты приложения"
Cohesion: 0.06
Nodes (34): scripts, build, check:migration-drift, dev, generate:types, lint, migrate, notifications:daemon (+26 more)

### Community 45 - "Форма товара"
Cohesion: 0.30
Nodes (10): ActionResult, errorMessage(), ProductInput, requireAdmin(), saveProduct(), syncProduct(), SyncResultAction, ImageItem (+2 more)

### Community 46 - "Страница поиска и sitemap"
Cohesion: 0.27
Nodes (9): dynamic, metadata, SearchPage(), SORT_PARAM, dynamic, sitemap(), getCategories(), getProducts() (+1 more)

### Community 47 - "Разовый перенос легаси"
Cohesion: 0.22
Nodes (7): ALIASES, aliasMap, DRY_RUN, failures, newByTitle, norm(), oldProducts

### Community 48 - "Карточка заказа в админке"
Cohesion: 0.07
Nodes (48): ActionResult, deleteOrderItem(), errorMessage(), requireAdmin(), SubmitOrderActionResult, submitOrderToMoySklad(), updateOrderItem(), UpdateOrderItemInput (+40 more)

### Community 49 - "Главная страница"
Cohesion: 0.29
Nodes (7): dynamic, HomePage(), metadata, HOW_IT_WORKS_FALLBACK, PrototypeHome(), PrototypePromo, PrototypePromoCarousel()

### Community 50 - "Страница товара витрины"
Cohesion: 0.44
Nodes (6): getCompatibleAccessories(), categoryNameOf(), cardData(), getKitComponentDocs(), PrototypeProduct(), unitOf()

### Community 51 - "Каналы мессенджеров"
Cohesion: 0.42
Nodes (7): clip(), responseError(), sendMax(), sendTelegram(), sendVk(), stableRandomId(), NotificationDelivery

### Community 52 - "Dev-зависимости"
Cohesion: 0.25
Nodes (8): devDependencies, eslint, eslint-config-next, tsx, @types/node, @types/react, @types/react-dom, typescript

### Community 53 - "Сиды и обслуживание медиа"
Cohesion: 0.16
Nodes (9): main(), url(), bookings, gradientPng(), main(), MEDIA_DIR, MEDIA_ONLY, promos (+1 more)

### Community 54 - "Сверка легаси-товаров"
Cohesion: 0.29
Nodes (6): exactMap, looseMap, norm(), normLoose(), oldProducts, stillUnmatched

### Community 55 - "Выбор дат на витрине"
Cohesion: 0.18
Nodes (20): businessDayIndex(), isBeforeBusinessToday(), addMonths(), fmtDay(), fmtRange(), Props, PrototypeDatePicker, PrototypeDatePickerHandle (+12 more)

### Community 59 - "Инструкция: порядок работ"
Cohesion: 0.29
Nodes (7): revalidate(), G2 🟠 Витрина перезагружается целиком на каждый переход, 2. Порядок работ, Блок B — Флоу дат и корзина, Блок C — Скорость (разметку не меняет), Блок D — Админка оператора, Блок E — Вёрстка экранов

### Community 60 - "Оформление заказа на сервере"
Cohesion: 0.20
Nodes (12): CheckoutInput, CheckoutItem, CheckoutResult, submitCheckout(), CheckoutErrorCode, CheckoutErrorData, CheckoutErrorInfo, checkoutErrorInfoFromUnknown() (+4 more)

### Community 61 - "Рантайм бандла дизайна"
Cohesion: 0.06
Nodes (76): boot(), bundledBlob(), cdnScriptFor(), collectProps(), compileAttr(), compileTemplate(), contentKey(), createComponentFactory() (+68 more)

### Community 62 - "Skill graphify"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 64 - "Smoke: промокоды"
Cohesion: 0.67
Nodes (6): body(), doc(), expectPromo(), main(), createSnapshotOrder(), url()

### Community 65 - "Шапка и поиск витрины"
Cohesion: 0.25
Nodes (8): PrototypeCartBadge(), PrototypeHeader(), EMPTY, PrototypeSearch(), rub, SearchCategoryItem, SearchProductItem, SearchResponse

### Community 66 - "Форматирование уведомлений"
Cohesion: 0.30
Nodes (14): sendNotificationDelivery(), adminContactEmail(), adminOrderEmail(), businessDate(), escapeHtml(), formatAdminEmail(), formatAdminMessage(), formatClientOrderEmail() (+6 more)

### Community 67 - "Аудит: деньги и даты"
Cohesion: 0.29
Nodes (7): A. Деньги и даты, N1 🔴 Интерфейс подсвечивает трое суток, а считает двое, N2 🟠 `calculateRentalDays` возвращает 0, а не одни сутки, N3 🔴 В корзине строка «Аренда за смену» показывает полную сумму, N4 🔴 Возврат в корзину на следующий день обнуляет её, N5 🟠 Часы работы: 9–21 в коде, 10–21 в подписи, N6 🟠 «5 смены»

### Community 69 - "Аудит: админка"
Cohesion: 0.29
Nodes (7): F. Админка оператора `(admin)/admin/*`, N17 🔴 Правка позиции пишет на сервер на каждое нажатие клавиши, N18 🟠 Статус в интерфейсе меняется, даже если сервер отказал, N19 🟠 «Сумма» заказа не пересчитывается после правки позиций, N20 🟠 Календарь занятости существует в двух версиях, и обе не показывают дефицит, N21 🟡 Очередь заявок и склад: нет ни поиска, ни фильтра, ни пагинации, N22 🟡 Пять экранов админки дизайн не описывает

### Community 71 - "Промокоды в админке"
Cohesion: 0.18
Nodes (16): ActionResult, createPromoCode(), CreatePromoCodeInput, deletePromoCode(), errorMessage(), requireAdmin(), updatePromoCode(), UpdatePromoCodeInput (+8 more)

### Community 72 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+12 more)

### Community 73 - "Аудит: оформление"
Cohesion: 0.33
Nodes (6): validate(), 0. Что стало со старыми находками (`06-audit.md`), C. Оформление, N10 🟠 Заявку можно отправить на занятое оборудование, N11 🟡 Маска телефона переписана с потерей вставки, N12 🟡 Согласия — не чекбоксы

### Community 77 - "Зависимости cms"
Cohesion: 0.11
Nodes (17): name, private, type, version, date-fns, eslint, graphql, @nanostores/persistent (+9 more)

### Community 78 - "Поиск по каталогу"
Cohesion: 0.16
Nodes (17): dynamic, GET(), filterNonEmptyCategories(), buildSearchWhere(), SEARCH_LIMITS, searchCatalog(), SearchCategoryItem, SearchProductItem (+9 more)

### Community 79 - "Сохранение настроек сайта"
Cohesion: 0.47
Nodes (5): ActionResult, errorMessage(), requireAdmin(), saveSiteSettings(), SiteSettingsInput

### Community 82 - "Рабочие инструкции ассистента"
Cohesion: 0.11
Nodes (18): 10. Working With Code, 11. Working With Visuals and Interfaces, 12. Working With Documents and Large Amounts of Information, 13. My Explicit Constraints Take Priority, 14. Correcting Your Own Mistakes, 15. Response Format, 16. When to Stop and Ask Me, 17. Final Completion Check (+10 more)

### Community 83 - "Браузерные smoke-тесты"
Cohesion: 0.13
Nodes (19): CdpSession, createTarget(), evaluate(), findChrome(), main(), navigate(), sleep(), waitForJson() (+11 more)

### Community 84 - "Анимации дизайна"
Cohesion: 0.11
Nodes (17): 03 — Анимации, 1. Вход блока — один раз, со стаггером 60мс, 2. Карточка при hover поднимается на 4px и получает единственную тень, 3. Кнопка при hover меняет фон и раздвигает gap, 4. Смена состояния — spring 320ms, 5. Смена значения — `bn-pop` через `key`, 6. Строка списка при hover получает подложку, иногда сдвигает контент, 7. Слайдер акций не двигает блоки (+9 more)

### Community 85 - "Runtime-зависимости"
Cohesion: 0.12
Nodes (17): dependencies, date-fns, graphql, nanostores, @nanostores/persistent, @nanostores/react, next, payload (+9 more)

### Community 86 - "README: для разработчика"
Cohesion: 0.33
Nodes (6): Для разработчика, Дополнительные документы, МойСклад: ручные команды, Полный стек в Docker (ближе всего к продакшену), После изменения кастомного админ-компонента Payload, Уведомления

### Community 89 - "Карточка товара в админке"
Cohesion: 0.26
Nodes (11): AdminProductDetailPage(), dynamic, generateMetadata(), loadAccessoryOptions(), loadProduct(), Props, rub(), EMPTY_STATS (+3 more)

### Community 90 - "Расчёт цены аренды"
Cohesion: 0.29
Nodes (8): calculateLineTotal(), calculateRentalDays(), calculateRentalPrice(), getRentalAvailability(), RentalAvailability, PrototypePurchasePanel(), CartItem, 14. 🟠 Корзина: устаревшие даты, спам уведомлений, сеть на каждый клик

### Community 91 - "Smoke: комплекты"
Cohesion: 0.70
Nodes (4): doc(), json(), main(), url()

### Community 94 - "README: запуск и выкладка"
Cohesion: 0.40
Nodes (5): 7. Запуск и выкладка, Контейнеры (`compose.yaml`), Локальная разработка, Обычная выкладка новой версии, Обязательные переменные `.env` на сервере

### Community 95 - "Аудит: каталог"
Cohesion: 0.50
Nodes (4): B. Каталог, N7 🟠 Каталог молча обрезается на 100 позициях, N8 🟡 Поиск из раздела «Наборы» теряет раздел, N9 🟡 На каждый рендер каталога — второй запрос на 500 товаров

### Community 99 - "Юридические страницы"
Cohesion: 0.16
Nodes (15): dynamic, metadata, PersonalDataConsentPage(), TOC, dynamic, metadata, PrivacyPolicyPage(), TOC (+7 more)

### Community 100 - "Отправка писем SMTP"
Cohesion: 0.19
Nodes (11): command(), expect(), headerBase64(), mailbox(), ReplyReader, sendSmtpMail(), smtpConfig(), SmtpMail (+3 more)

### Community 105 - "Синхронизация дизайна"
Cohesion: 0.25
Nodes (11): Как пользоваться, arg(), audit(), countBy(), die(), extract(), readSpec(), scriptBody() (+3 more)

### Community 112 - "Списки заказов и наборов"
Cohesion: 0.13
Nodes (22): AdminKitsPage(), dynamic, FragmentRow(), metadata, AdminOrdersPage(), dynamic, isOrderStatus(), metadata (+14 more)

### Community 117 - "Smoke: лимиты и вход"
Cohesion: 0.44
Nodes (10): assertAnonymousAdminRedirect(), assertContactRateLimit(), assertLoginRateLimit(), assertUsersCollectionClosed(), contactAttempt(), expectDenied(), loginAttempt(), main() (+2 more)

### Community 119 - "Примитивы дизайна"
Cohesion: 0.12
Nodes (16): 02 — Примитивы, P10. Чекбокс, P11. День календаря, P12. Строка таблицы (админка), P13. Бейдж статуса, P14. Степпер количества, P1. Primary CTA (pill), P2. Quiet-кнопка (+8 more)

### Community 125 - "Лимиты запросов и пользователи"
Cohesion: 0.19
Nodes (13): Users, promoCodeValidateEndpoint, getClientIp(), capRateLimitKey(), checkRateLimit(), checkRateLimits(), envInt(), getAdapter() (+5 more)

### Community 126 - "Сид визуальных данных"
Cohesion: 0.25
Nodes (7): adminEmail, adminPassword, categories, main(), products, upsertCategory(), VisualProduct

### Community 136 - "Токены дизайна"
Cohesion: 0.13
Nodes (14): 01 — Токены, 1. Цвет, 2. Типографика, 3. Радиусы, 4. Тени, 5. Сетка и спейсинг, Брейкпоинты (ровно три), Внутренние отступы (+6 more)

### Community 137 - "Медиатека в админке"
Cohesion: 0.23
Nodes (11): ActionResult, deleteMedia(), errorMessage(), requireAdmin(), updateMediaAlt(), AdminMediaPage(), dynamic, metadata (+3 more)

### Community 140 - "Доступность в каталоге"
Cohesion: 0.35
Nodes (9): getRentalAvailabilityBulk(), PrototypeCatalogAvailability(), $catalogAvailability, CatalogAvailabilityState, CatalogAvailabilityStatus, resetCatalogAvailability(), setCatalogAvailabilityFailed(), setCatalogAvailabilityLoading() (+1 more)

### Community 145 - "Скрипт превью"
Cohesion: 0.29
Nodes (7): DATABASE_URI, need(), NOTIFICATIONS_ENABLED, preview.sh script, SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD, WEB_URL

### Community 146 - "API Payload и Next-конфиг"
Cohesion: 0.15
Nodes (9): nextConfig, POST, DELETE, GET, OPTIONS, PATCH, POST, PUT (+1 more)

### Community 148 - "Smoke: аналитика"
Cohesion: 0.57
Nodes (6): fetchAnalytics(), json(), kemerovoDate(), main(), url(), visibleText()

### Community 149 - "Аудит живого приложения"
Cohesion: 0.20
Nodes (9): 07 — Аудит живого приложения, D. Движение и токены, E. Мобильная версия, H. Не проверено, N13 🟡 Кривые прописаны литералами мимо токенов, N14 🟡 Крестик закрытия крутится не по той кривой, N15 🟡 Плашка «занято» и её легенда — разные цвета, N16 🟡 Хит-таргеты в модалке дат меньше 44px (+1 more)

### Community 150 - "Smoke: запуск"
Cohesion: 0.67
Nodes (6): expectContactValidation(), expectRedirect(), expectStatus(), main(), url(), waitForReady()

### Community 151 - "План визуального паритета"
Cohesion: 0.15
Nodes (12): 1. Close the current CI run, 2. Validate motion in a real browser, 3. Interactive motion verification, 4. Verify motion across reference viewports, 5. Finish remaining static visual parity, 6. Regression-check business behavior, 7. Final regression pass, Current next action (+4 more)

### Community 156 - "Ручной smoke-чеклист 2.0"
Cohesion: 0.11
Nodes (18): 0. Automated gate, 10. Direct notifications and monitoring, 11. `/cms` break-glass fallback, 12. Final deployment/cutover checks, 1. App startup and shared chrome, 2. Catalog and product browsing, 3. Dates, availability and cart, 4. Checkout and promo codes (+10 more)

### Community 161 - "Корневой package.json"
Cohesion: 0.33
Nodes (5): name, packageManager, private, type, version

### Community 175 - "Smoke: данные админки"
Cohesion: 0.80
Nodes (4): body(), main(), fetchAdminPage(), url()

### Community 176 - "Smoke: публичная безопасность"
Cohesion: 0.71
Nodes (6): expectDenied(), expectLoginNext(), expectRetiredCmsRoute(), latestSubmittedFixture(), main(), url()

### Community 187 - "Smoke: жизненный цикл заказа"
Cohesion: 0.83
Nodes (3): json(), main(), url()

### Community 258 - "План миграции на Next"
Cohesion: 0.20
Nodes (10): Зачем, Оценка, План миграции: `apps/web` (Astro) → Next.js App Router внутри `apps/cms`, Риски, Стратегия: strangler, а не big bang, Целевая форма, Что удаляется по итогу, Этап 1 — Каркас витрины + разворот прокси (+2 more)

### Community 259 - "Экраны дизайна"
Cohesion: 0.18
Nodes (10): 04 — Экраны, S0. Шапка · `src/components/Navbar.tsx`, S1. Главная · `src/pages/Index.tsx`, S2. Каталог · `src/pages/Catalog.tsx` + `src/components/catalog/*`, S3. Карточка товара · `src/pages/ProductDetail.tsx`, S4. Корзина · `src/pages/Checkout.tsx` + `src/components/checkout/*`, S5. Как это работает / Контакты · `src/pages/HowItWorks.tsx`, `Contacts.tsx`, S6. Логин и 404 · `src/pages/Login.tsx`, `NotFound.tsx` (+2 more)

### Community 260 - "План работ дизайна"
Cohesion: 0.20
Nodes (9): 05 — План работ, Как теперь доставляется дизайн, Порядок работ, Что изменилось против прошлой редакции этого файла, Что не делать, Ш1 — Перепроверить аудит против живого кода, Ш2 — Свести цену в одно место, Ш3 — Движение (+1 more)

### Community 261 - "Текущий план выполнения"
Cohesion: 0.20
Nodes (10): 2026-09-21 — storefront rewrite regression pass, Design handoff — `design_handoff_swiss_bento`, Final deployment gate, Ground rules, Immediate next action, Independent development status, Owner/product decisions for this release, Playback Rental 2.0 — Current Execution Roadmap (+2 more)

### Community 263 - "graphify: экспорты"
Cohesion: 0.25
Nodes (7): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 264 - "Дизайн-аудит 2.0"
Cohesion: 0.18
Nodes (10): 2026-09-17 — дизайн-аудит 2.0, DESIGN-001 🟠 Тач-таргеты на клиентском пути ниже 44px, DESIGN-002 🟠 `--color-subtle` не добирает контраст на фоне страницы, DESIGN-004 🟡 Девять полей ввода без видимой подписи, Индекс находок, Метод, О нумерации, Предлагаемый порядок (+2 more)

### Community 265 - "README проекта"
Cohesion: 0.15
Nodes (13): 10. Что делать, если…, 11. Безопасность: коротко, 12. Что ещё не доделано / на что обратить внимание, 1. Что это, 2. Откуда берутся данные, 3. Как считается цена аренды, 4. Заказ: что происходит после «Отправить заявку», 5. Админка: что где (+5 more)

### Community 266 - "Прямые уведомления на VDS"
Cohesion: 0.22
Nodes (9): Delivery semantics, Direct notifications on the VDS, Email / SMTP, Enable production delivery, Final acceptance on the VDS, MAX, Safe local/Codespaces testing, Telegram (+1 more)

### Community 267 - "План кастомной админки"
Cohesion: 0.20
Nodes (10): План работ, Шаг 0 — подготовка, Шаг 1 — почини инфраструктуру прокси (полдня, низкий риск), Шаг 2 — Docker, Шаг 3 — оболочка админки и авторизация (1–1.5 дня, низкий риск), Шаг 4 — дашборды (3–4 дня, низкий риск), Шаг 5 — операции по заказам (2–3 дня, средний риск), Шаг 6 — редактирование каталога (4–6 дней, высокий риск/объём) (+2 more)

### Community 270 - "Рабочие заметки CLAUDE.md"
Cohesion: 0.33
Nodes (6): Architecture facts worth not re-deriving, Branches (owner's rule), Dev log, graphify, Playback Rental 2.0 — working notes, What this is

### Community 271 - "README дизайн-хэндоффа"
Cohesion: 0.25
Nodes (7): Handoff: Playback Rental — Swiss/Bento redesign, Активы, Важное про доставку, С чего начать, Фидельность, Что в пакете, Что это

### Community 272 - "Иерархия категорий"
Cohesion: 0.25
Nodes (4): Behavior, Hierarchical categories — sidebar spec, Non-spec (deliberately unset, don't invent), Visual spec

### Community 273 - "Кастомная админка: решения"
Cohesion: 0.25
Nodes (8): Context, Playback Rental — кастомная админка на headless Payload + переезд в Docker, Источник дизайна, Ключевые файлы, Находки, меняющие реализацию, Проверка, Решения, принятые с владельцем, Целевой стек

### Community 274 - "Инструкция для агента"
Cohesion: 0.29
Nodes (6): 08 — Инструкция для агента, 0. Контекст в одном экране, 1. Как доставляется дизайн, 3. Что не делать, 4. Где прототип не источник истины, 5. Порядок сдачи

### Community 275 - "Бесплатный превью-хостинг"
Cohesion: 0.29
Nodes (6): Другой хостинг, Как развернуть, Постоянная внешняя ссылка бесплатно, Чем бесплатно отличается от платного, Что делает `start-hosted.sh`, Что стенд не делает

### Community 276 - "Выгрузка дизайна"
Cohesion: 0.25
Nodes (8): Выгрузка дизайна из Claude Design, Куда это встроить, Что внутри бандла, Что даёт `spec`, Что показал `audit` на текущем коде, Что этот план не делает, Этап 0 — Подготовка (до единой строки переноса), spec()

### Community 278 - "Бэклог фич"
Cohesion: 0.29
Nodes (7): Feature backlog — current state, Post-roadmap owner request — direct notifications, Wave 1 — independent fixes, Wave 2 — orders/pricing, Wave 3 — infrastructure, Wave 4 — image source optimisation, Wave 5 — analytics

### Community 279 - "Агент-ревьюер кода"
Cohesion: 0.50
Nodes (3): Method, Output, What to check, roughly in priority order

### Community 280 - "Агент-тестировщик"
Cohesion: 0.33
Nodes (5): Fast checks (always run these first), Live verification, when the change touches real request flow, Output, Smoke-test checklist (run relevant items after any change that could touch them), Writing actual tests

### Community 281 - "graphify: запросы"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 285 - "Агент выкладки"
Cohesion: 0.40
Nodes (4): Hard rule: never execute the irreversible step yourself, Output, What this app currently is, concretely, Your actual job, most of the time

### Community 286 - "Мониторинг ошибок"
Cohesion: 0.40
Nodes (4): Error monitoring — GlitchTip, Self-host GlitchTip, Source maps, What the application captures

### Community 287 - "Локальный превью"
Cohesion: 0.40
Nodes (4): Внешняя ссылка, Живой просмотр 2.0 на своей машине, Что в базе, Что стоит посмотреть

### Community 289 - "README приложений"
Cohesion: 0.50
Nodes (3): Local dev, Playback Rental 2.0 — `apps/`, Where the rest is written down

### Community 290 - "Агент-ревьюер миграций"
Cohesion: 0.50
Nodes (3): Output, Verification, when a local DB is available, What to check

### Community 291 - "Агент-летописец роадмапа"
Cohesion: 0.50
Nodes (3): What "correct" means here, specifically, What you don't do, Workflow

### Community 292 - "graphify: add и watch"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 293 - "graphify: хуки"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 294 - "graphify: обновление"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **684 isolated node(s):** `DescriptionInput`, `KitLineInput`, `MsEntityRef`, `RetryPushResult`, `SubmitItem` (+679 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 976 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **195 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Playback Rental 2.0 — dev log` connect `Данные товаров и DEV-LOG` to `Отправка заказа в МойСклад`, `Настройки сайта и данные`, `Даты аренды и корзина`, `Промоакции и карточки товара`, `Медиатека в админке`, `Каталог витрины`, `Синхронизация с МойСклад`, `SEO и страница товара`, `Пользователи админки`, `Доступность в каталоге`, `Корневые макеты`, `Визуальная регрессия`, `Вход и первая регистрация`, `Форма акции`, `Клиенты и счётчики меню`, `Календарь занятости`, `Страница оформления заказа`, `Форма категории`, `Ручной заказ`, `Очередь уведомлений`, `Ключевые документы`, `Категории и склад в админке`, `Общие остатки и доступность`, `Страница поиска и sitemap`, `Карточка заказа в админке`, `Оформление заказа на сервере`, `Рантайм бандла дизайна`, `Аудит: оформление`, `Поиск по каталогу`, `Карточка товара в админке`, `Расчёт цены аренды`, `Статус остатка`, `Списки заказов и наборов`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `payload` connect `Конфиг Payload и склад` to `Отправка заказа в МойСклад`, `Настройки сайта и данные`, `Форма контакта и тесты`, `Промоакции и карточки товара`, `Медиатека в админке`, `Каталог витрины`, `Синхронизация с МойСклад`, `Пользователи админки`, `Корневые макеты`, `Список и карточка акций`, `Вход и первая регистрация`, `Данные товаров и DEV-LOG`, `Форма акции`, `Клиенты и счётчики меню`, `Данные наборов`, `Календарь занятости`, `Форма категории`, `Ручной заказ`, `Аналитика и KPI`, `Форма ручного заказа`, `Категории и склад в админке`, `Общие остатки и доступность`, `Форма набора`, `Форма товара`, `Разовый перенос легаси`, `Карточка заказа в админке`, `Страница товара витрины`, `Сиды и обслуживание медиа`, `Сверка легаси-товаров`, `Оформление заказа на сервере`, `Промокоды в админке`, `Зависимости cms`, `Поиск по каталогу`, `Сохранение настроек сайта`, `Карточка товара в админке`, `Сид smoke-данных`, `Статус остатка`, `Лимиты запросов и пользователи`, `Сид визуальных данных`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `next` connect `Настройки сайта и данные` to `Даты аренды и корзина`, `Промоакции и карточки товара`, `Медиатека в админке`, `Каталог витрины`, `SEO и страница товара`, `Пользователи админки`, `Корневые макеты`, `Список и карточка акций`, `Вход и первая регистрация`, `Данные товаров и DEV-LOG`, `Форма акции`, `Клиенты и счётчики меню`, `Данные наборов`, `Календарь занятости`, `Страница оформления заказа`, `Форма категории`, `Ручной заказ`, `Аналитика и KPI`, `Форма ручного заказа`, `Категории и склад в админке`, `Форма набора`, `Форма товара`, `Страница поиска и sitemap`, `Карточка заказа в админке`, `Главная страница`, `Страница товара витрины`, `Оформление заказа на сервере`, `Шапка и поиск витрины`, `Промокоды в админке`, `Зависимости cms`, `Поиск по каталогу`, `Сохранение настроек сайта`, `Карточка товара в админке`, `Юридические страницы`, `Списки заказов и наборов`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 60 inferred relationships involving `Playback Rental 2.0 — dev log` (e.g. with `validate()` and `AdminLayout()`) actually correct?**
  _`Playback Rental 2.0 — dev log` has 60 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `mediaUrl()` (e.g. with `G3 🟠 `next/image` не используется ни разу, отдаются оригиналы` and `Блок C — Скорость (разметку не меняет)`) actually correct?**
  _`mediaUrl()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DescriptionInput`, `KitLineInput`, `MsEntityRef` to the rest of the system?**
  _684 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Отправка заказа в МойСклад` be split into smaller, more focused modules?**
  _Cohesion score 0.07878787878787878 - nodes in this community are weakly interconnected._