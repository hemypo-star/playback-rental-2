import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout, { type LegalTocItem } from '../../../components/LegalPageLayout'
import { LEGAL_DOCUMENTS, revisionLabel } from '../../../lib/legal/documents'
import { buildMetadata } from '../../../lib/seo'

// Separate consent to personal-data processing (152-FZ art. 9 part 4), linked
// from the consent checkboxes on checkout and the contact form. Since
// 2025-09-01 the law requires this consent to be a document of its own, apart
// from the privacy policy and the user agreement. Operator details are the
// ones already published in privacy-policy/page.tsx; keep the two in sync.
//
// force-dynamic: same reason as the other legal pages — the shared layout's
// Footer reads site settings, which Docker's build stage cannot.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildMetadata({
  title: 'Согласие на обработку персональных данных',
  path: '/personal-data-consent',
})

const TOC: LegalTocItem[] = [
  { id: 's1', label: '1. Оператор' },
  { id: 's2', label: '2. Цели обработки' },
  { id: 's3', label: '3. Перечень персональных данных' },
  { id: 's4', label: '4. Действия и способы обработки' },
  { id: 's5', label: '5. Передача третьим лицам' },
  { id: 's6', label: '6. Срок действия и отзыв согласия' },
]

export default function PersonalDataConsentPage() {
  return (
    <LegalPageLayout title="Согласие на обработку персональных данных" subtitle={`Редакция от ${revisionLabel(LEGAL_DOCUMENTS.personalDataConsent.revision)}`} toc={TOC}>
      <section>
        <p>
          Отмечая соответствующую галочку и&nbsp;отправляя заявку на&nbsp;аренду или&nbsp;сообщение через форму обратной связи на
          сайте https://playbackrental.ru (далее&nbsp;— Сайт), я&nbsp;свободно, своей волей и&nbsp;в&nbsp;своём интересе даю согласие на
          обработку моих персональных данных на&nbsp;условиях, изложенных ниже, в&nbsp;соответствии с&nbsp;Федеральным законом от
          27.07.2006 № 152-ФЗ «О&nbsp;персональных данных».
        </p>
      </section>

      <section>
        <h2 id="s1" className="scroll-mt-[112px] text-[18px] font-semibold text-foreground">1. Оператор</h2>
        <p className="mt-3">
          Оператор персональных данных&nbsp;— ИП&nbsp;Данко Александр Юрьевич, ИНН 421718911238, ОГРНИП 320420500076682,
          адрес регистрации: г.&nbsp;Кемерово, пр.&nbsp;Молодежный 19б, кв.&nbsp;349, электронная почта: PlaybackRental@yandex.ru
          (далее&nbsp;— Оператор).
        </p>
      </section>

      <section>
        <h2 id="s2" className="scroll-mt-[112px] text-[18px] font-semibold text-foreground">2. Цели обработки</h2>
        <p className="mt-3">2.1. Приём, обработка и&nbsp;подтверждение заявки на&nbsp;аренду оборудования, связь со&nbsp;мной по&nbsp;заявке.</p>
        <p className="mt-3">2.2. Заключение, исполнение и&nbsp;прекращение договора аренды, учёт заказов.</p>
        <p className="mt-3">2.3. Ответ на&nbsp;моё обращение, отправленное через форму обратной связи.</p>
      </section>

      <section>
        <h2 id="s3" className="scroll-mt-[112px] text-[18px] font-semibold text-foreground">3. Перечень персональных данных</h2>
        <p className="mt-3">
          Имя, номер телефона, адрес электронной почты, а&nbsp;также сведения, которые я&nbsp;указываю в&nbsp;заявке или
          сообщении: состав заказа, даты аренды, комментарий, тема и&nbsp;текст обращения.
        </p>
      </section>

      <section>
        <h2 id="s4" className="scroll-mt-[112px] text-[18px] font-semibold text-foreground">4. Действия и&nbsp;способы обработки</h2>
        <p className="mt-3">
          Согласие даётся на&nbsp;сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение),
          извлечение, использование, передачу (предоставление, доступ), блокирование, удаление и&nbsp;уничтожение
          персональных данных. Обработка ведётся с&nbsp;использованием средств автоматизации и&nbsp;без&nbsp;них.
        </p>
      </section>

      <section>
        <h2 id="s5" className="scroll-mt-[112px] text-[18px] font-semibold text-foreground">5. Передача третьим лицам</h2>
        <p className="mt-3">
          Для&nbsp;достижения целей, указанных в&nbsp;разделе 2, Оператор вправе поручить обработку персональных данных лицам,
          с&nbsp;которыми у&nbsp;него заключены договоры: хостинг-провайдеру, на&nbsp;сервере которого размещён Сайт, и&nbsp;сервису
          учёта заказов и&nbsp;остатков, в&nbsp;котором Оператор ведёт учёт аренды. Такие лица обрабатывают данные только по
          поручению Оператора и&nbsp;обязаны соблюдать их&nbsp;конфиденциальность. Иная передача возможна только в&nbsp;случаях,
          предусмотренных законодательством Российской Федерации.
        </p>
      </section>

      <section>
        <h2 id="s6" className="scroll-mt-[112px] text-[18px] font-semibold text-foreground">6. Срок действия и&nbsp;отзыв согласия</h2>
        <p className="mt-3">
          6.1. Согласие действует до&nbsp;достижения целей обработки либо до&nbsp;его отзыва, если&nbsp;иное не&nbsp;предусмотрено
          законодательством Российской Федерации.
        </p>
        <p className="mt-3">
          6.2. Я&nbsp;могу отозвать согласие, направив заявление на&nbsp;электронную почту PlaybackRental@yandex.ru. После
          получения отзыва Оператор прекращает обработку и&nbsp;уничтожает персональные данные в&nbsp;сроки, установленные
          Федеральным законом № 152-ФЗ, за&nbsp;исключением случаев, когда обработка может быть продолжена без&nbsp;согласия
          по&nbsp;основаниям, предусмотренным этим законом.
        </p>
        <p className="mt-3">
          6.3. Порядок обработки персональных данных Оператором описан в{' '}
          <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-accent">
            Политике конфиденциальности
          </Link>
          .
        </p>
      </section>
    </LegalPageLayout>
  )
}
