# 02 — Примитивы

14 примитивов, из которых собраны все экраны. Значения — финальные.
Каждый примитив: где живёт в репозитории, разметка, состояния.

Общее правило: **интерактив — это `<button>` или `<a>`, никогда `div` с `onClick`.**
В прототипе всё на `div` (ограничение прототипа), в проде — семантика + `focus-visible`.

---

## P1. Primary CTA (pill)

`height: 54px` (главный CTA) / `56px` (в товаре и корзине) / `48px` (в модалке) /
`44px` (в карточке каталога) / `42px` (в шапке админки).

```
покой:   background #0A0A0A; color #fff; border-radius 999px;
         padding 0 12px 0 24px; display flex; align-items center; gap 20px;
         font-size 11.5px; weight 600; ls 0.13em; uppercase;
hover:   background #D62410;  gap 30px;
transition: background 240ms ease, gap 380ms cubic-bezier(0.16,1,0.3,1);
```

Внутри — текст + круг со стрелкой: `34px; border-radius 50%; background rgba(255,255,255,0.15)`.

**Анимация «gap растёт» — сигнатурный жест системы.** Он есть у primary CTA, у чипа
корзины (`gap 10 → 14`), у кнопки «весь каталог» (`12 → 20`), у кнопки админки (`12 → 20`),
у кнопки модалки (`14 → 22`). Не заменять на `translateX` — двигается только стрелка
относительно текста, сама кнопка стоит на месте.

Вариант на тёмном фоне (CTA-блок главной): `background #fff; color #0A0A0A`,
hover → `background #D62410; color #fff`, круг `rgba(10,10,10,0.1)`.

Файлы: `src/components/ui/button.tsx` — добавить варианты `pill` и `pillLight`;
не трогать существующие варианты, ими пользуется админка.

## P2. Quiet-кнопка

```
покой:   background #F4F3F1; color #0A0A0A; radius 999px; height 54/42/38/36px;
         font 11px/600/0.10–0.12em uppercase;
hover:   background #0A0A0A; color #fff;
transition: background 240ms ease, color 240ms ease;
```
Полная инверсия при hover — второй сигнатурный жест. Применяется к: «Готовые наборы»,
чип даты в шапке, «Добавить» у аксессуара, «Одобрить» у клиента, «Весь каталог».

## P3. Круглая кнопка

`46px` (навигация промо) · `38px` (закрыть модалку) · `32px` (стрелка в категории).

- «Назад»: `background #FFFFFF; border 1px solid rgba(10,10,10,0.1)`,
  hover → `#0A0A0A/#fff` + `translate: -2px 0`.
- «Вперёд»: `background #0A0A0A; color #fff`, hover → `#D62410` + `translate: 2px 0`.
- «Закрыть»: `background #F4F3F1`, hover → `#0A0A0A/#fff` + `rotate: 90deg`
  (`320ms cubic-bezier(0.34,1.56,0.64,1)`).
- Стрелка в карточке категории: `#F4F3F1` → hover карточки → `#D62410/#fff`.

## P4. Карточка

```
background #FFFFFF; border 1px solid rgba(10,10,10,0.07); border-radius 24px;
padding 24px | 26px | 14px (если внутри медиа во всю ширину)
hover (только у кликабельных):
  translate: 0 -4px; box-shadow 0 26px 48px -32px rgba(10,10,10,0.42);
  border-color rgba(10,10,10,0.15);
transition: translate 420ms expo, box-shadow 420ms expo, border-color 240ms ease;
вход: animation bn-in 560ms expo both; animation-delay: index * 60ms;
```

Некликабельные карточки (заголовок страницы, «как это работает», итог) **не поднимаются**.
Это различие несёт смысл: поднимается то, что ведёт куда-то.

Радиусы по размеру: hero/промо `26px`, обычная `24px`, stat/KPI/related `22px`.

Файл: `src/components/ui/card.tsx` — переписать базовые классы, убрать `shadow-sm`.

## P5. Медиа внутри карточки

```
position relative; border-radius 16px; overflow hidden; background #E6E4E0;
aspect-ratio: 4/3 (каталог, категории, related) | 3/2 (наборы) | 4/3 (hero товара, radius 26px)
img: object-fit cover; width/height 100%
zoom при hover обёртки: transform scale(1.04), transition 900ms expo
```

`aspect-ratio` обязателен: он держит место до загрузки и убирает CLS.
В репозитории карточка каталога сейчас `aspect-square` — заменить на `4/3`.

Файл: `src/components/product/ProductImage.tsx`.

## P6. Чип на медиа

```
позиция: left 10–12px; top 10–12px (тег категории) / right (наличие)
padding 5px 10px | 6px 11px | 7px 13px (в товаре)
radius 999px; font 9–10px/600/0.14em uppercase; pointer-events none
тёмный:  background rgba(10,10,10,0.72); backdrop-filter blur(10px); color #fff
светлый: background rgba(255,255,255,0.86); backdrop-filter blur(10px); color #0A0A0A
акцентный (в наборах, «выгода 450 ₽»): background #D62410; color #fff
```

## P7. Чип наличия (статусный)

Отдельно от P6, потому что несёт данные:

| Состояние | Стиль |
|---|---|
| Свободно | `background rgba(10,10,10,0.06); color #0A0A0A` |
| С 14 авг (частично) | `background rgba(255,255,255,0.86); color #0A0A0A` |
| Занято до 16 авг | `background rgba(214,36,16,0.12); color #D62410` |

**Не полагаться на цвет:** текст чипа всегда сам сообщает состояние словами и датой.

## P8. Инпут

```
height 48px; width 100%; padding 0 16px; radius 14px;
border 1px solid rgba(10,10,10,0.1); background #F9F8F7; font-size 15px;
focus: border-color #0A0A0A; background #FFFFFF;
transition: border-color 240ms ease, background 240ms ease;
label: 10.5px/600/0.12em uppercase #75736E, margin-bottom 8px
ошибка: border-color #D62410; сообщение 12.5px #D62410 под полем, margin-top 6px
```

Файл: `src/components/ui/input.tsx`. Лейбл — видимый всегда, не placeholder-only.
Placeholder несёт пример (`+7 ___ ___-__-__`), а не имя поля.

## P9. Тумблер

```
трек: 42×24; radius 999px; padding 3px;
      off #E6E4E0 → on #0A0A0A; transition background 240ms ease
кнопка: 18×18; radius 50%; background #fff;
      transform translateX(0) → translateX(18px);
      transition transform 320ms cubic-bezier(0.34,1.56,0.64,1)
```
Spring-кривая обязательна — это язык «смены состояния» (см. `03-motion.md`).

## P10. Чекбокс

```
22×22; radius 7px; font-size 12px; weight 700; галочка «✓»
off: background #F4F3F1; color transparent
on:  background #0A0A0A; color #fff; scale 1.06 → 1 (spring 320ms)
обёртка (кликабельная строка): padding 12px; margin 0 -12px; radius 14px;
      hover background #F4F3F1
подпись: 12.5px/1.45 #4A4844
```

Файл: `src/components/ui/checkbox.tsx`.

## P11. День календаря

Два размера: `11px` радиус (компактный в карточке товара) и `12px` (в модалке).

| Состояние | Стиль |
|---|---|
| Обычный | `background transparent; color #0A0A0A` |
| Вне месяца | `color rgba(10,10,10,0.25)` |
| Занято | `background rgba(214,36,16,0.14); color #D62410; cursor not-allowed` |
| В выбранном диапазоне | `background #F4F3F1` |
| Край диапазона (выдача/возврат) | `background #0A0A0A; color #fff` |
| Сегодня | `box-shadow inset 0 0 0 1px rgba(10,10,10,0.2)` |

```
aspect-ratio 1/1; display flex center; font-size 12.5px (13px в модалке);
transition: background 240ms ease, color 240ms ease,
            transform 320ms cubic-bezier(0.34,1.56,0.64,1);
```

Легенда обязательна: чёрный квадратик `10×10 radius 3px` = «Ваши даты»,
`rgba(214,36,16,0.14)` = «Занято». Подписи `10.5px/0.06em uppercase #75736E`.

Файл: `src/components/ui/calendar.tsx` (react-day-picker) — переопределить `classNames`,
не переписывать компонент.

## P12. Строка таблицы (админка)

```
display grid; gap 14px; align-items center; padding 15px 10px; radius 14px;
font-size 13.5px; hover background #F4F3F1; transition background 240ms ease;
вход: bn-in 560ms expo, delay index*40ms
шапка: padding 0 10px 12px; font 10px/600/0.13em uppercase #75736E
```

Раскладки колонок (фиксированные, не `auto`):
- Заявки: `90px 1.6fr 1.4fr 1fr 110px 130px`
- Склад: `2fr 1.2fr 90px 110px 130px`
- Контент: `2.2fr 1fr 130px`
- Аналитика: `200px 1fr 100px`
- Гантт: `210px 1fr`

На ≤1020px таблица превращается в список карточек (см. `04-screens.md`, «Админка · мобайл»).

## P13. Бейдж статуса

```
padding 6px 12px; radius 999px; font 10px/600/0.10em uppercase; justify-self start;
```
Тона — `01-tokens.md` §1. Только три тона, никаких «зелёный/синий/жёлтый».

## P14. Степпер количества

```
обёртка: display flex; radius 999px; background #EFEEEB; padding 3px;
кнопки −/+: 30×28; radius 999px; font-size 15px;
            hover background #0A0A0A; color #fff; transition background 220ms ease
число: min-width 32px; center; 13.5px/600; при смене — animation bn-pop 380ms
```

Число анимируется через `key={qty}` (React перемонтирует span → анимация играет заново).
Это единственный способ получить «пульс» на смене значения без библиотек.

Файл: `src/components/QuantitySelector.tsx` — уже существует, заменить визуал.
**Мобайл:** кнопки 30×28 меньше 44px. На ≤760px увеличить до `44×44`.

---

## Что удалить из старого визуального языка

| Было | Стало |
|---|---|
| `glass-panel`, `glass-card`, `shadow-glass` | `.pb-card` + `shadow-lift` на hover |
| `btn-ghost`, `btn-primary` (opacity .9 на hover) | P1/P2 (смена фона, не прозрачности) |
| `heading-1…4`, `body-text`, `small-text` | шкала из `01-tokens.md` §2 |
| `chip` (px-3 py-1 text-xs bg-secondary) | P6/P7 (caps + трекинг обязательны) |
| `card-hover` (только box-shadow) | P4 (подъём + тень + граница) |
| `animate-in`, `animate-in-up/down/scale` | `bn-in`, `bn-rise`, `bn-pop` |
| `.subtle-ring`, `.smooth-transition` | не нужны |
