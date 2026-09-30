import React from 'react';
import { X, Bell, Landmark, Music4, ExternalLink } from 'lucide-react';

interface GefleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GefleInfoModal: React.FC<GefleInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold text-base text-amber-100">
              О карильоне Gefle Bells (Gävle Rådhus)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 flex items-start gap-3">
            <Landmark className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-display font-bold text-sm text-amber-200 mb-1">
                Карильон городской ратуши Евле (Швеция)
              </h4>
              <p className="text-stone-400">
                Карильон «Gefle Bells» установлен в башне ратуши города Евле (Gävle Rådhus) в 1972 году. Инструмент состоит из 36 колоколов ручной отливки знаменитой шведской колокололитейной мануфактуры <strong>Bergholtz Klockgjuteri</strong>. Самый тяжелый колокол (бурдон) весит 285 кг.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
              <Music4 className="w-4 h-4 text-amber-400" />
              <span>Акустическое строение и гармоники колоколов</span>
            </h4>
            <p className="text-stone-400">
              Каждый карильонный колокол настраивается с высочайшей точностью на 5 фундаментальных тонов:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-stone-300 pl-1">
              <li><strong>Hum tone (гул / суб-октава)</strong> — глубокий устойчивый резонанс на октаву ниже основного тона.</li>
              <li><strong>Prime (ударный тон)</strong> — фундаментальная высота колокола.</li>
              <li><strong>Tierce (малая терция)</strong> — характерный тембровый маркер карильона, придающий колоколу благородный задумчивый оттенок.</li>
              <li><strong>Quint (чистая квинта)</strong> — чистая гармоническая опора.</li>
              <li><strong>Nominal (октава выше)</strong> — яркий верхний обертон, формирующий первоначальный отклик удара.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-amber-300 mb-1.5">
              Техника игры на карильоне
            </h4>
            <p className="text-stone-400">
              В отличие от традиционных русских звонниц (управляемых веревочными тягами за языки, как в тренажере <code className="text-amber-300">bv-zvon-1</code>), на карильоне играют за специальной механической консолью — <strong>мануалом (clavier)</strong>. Исполнитель ударяет полусжатыми кулаками или пальцами по дубовым рукояткам (batons), а ногами нажимает педали, управляющие самыми тяжелыми басовыми колоколами.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-amber-300 mb-1.5">
              Сэмплерная библиотека Gefle Bells
            </h4>
            <p className="text-stone-400">
              Уникальное богатое звучание 36 колоколов Евле вдохновило композитора Пера Самуэльссона (Per Samuelsson) записать акустическую библиотеку сэмплов Gefle Bells и использовать колокольню в качестве солирующего инструмента в новогодней концертной поэме «Aditus».
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
