// Библиотека упражнений Forma. Тексты свои; RU / EN / SR (латиница).
export type Lang = 'ru' | 'en' | 'sr'
export type L3 = [string, string, string]

export type Muscle =
  | 'chest' | 'shoulders' | 'triceps' | 'biceps' | 'forearms'
  | 'lats' | 'traps' | 'lowerback' | 'abs' | 'obliques'
  | 'glutes' | 'quads' | 'hamstrings' | 'calves'

export type Equip =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'pullup_bar' | 'dip_bars' | 'bench'
  | 'band' | 'cable' | 'machine' | 'rack'
  | 'chair' | 'sofa' | 'backpack' | 'bottles' | 'towel' | 'table'

export type Mode = 'wr' | 'r' | 't' // вес×повторы, повторы, время
export type Pattern =
  | 'push_h' | 'push_v' | 'pull_h' | 'pull_v' | 'squat' | 'hinge' | 'lunge'
  | 'core' | 'biceps' | 'triceps' | 'delts' | 'calves' | 'cardio'

export interface Exercise {
  id: string
  name: L3
  primary: Muscle[]
  secondary: Muscle[]
  equip: Equip[][] // каждая группа — «любое из»
  mode: Mode
  pattern: Pattern
  prio: number // чем выше, тем охотнее генератор берёт упражнение
  quiet: boolean // можно в квартире без прыжков
  small: boolean // хватает коврика
  level: 1 | 2 | 3 | 4 | 5
  steps: L3[]
  caution?: L3
  custom?: boolean
}

type Opt = Partial<Pick<Exercise, 'quiet' | 'small' | 'level' | 'caution'>>
const E = (
  id: string, name: L3, pattern: Pattern, mode: Mode, prio: number,
  primary: Muscle[], secondary: Muscle[], equip: Equip[][], steps: L3[], o: Opt = {},
): Exercise => ({
  id, name, pattern, mode, prio, primary, secondary, equip, steps,
  quiet: o.quiet ?? true, small: o.small ?? true, level: o.level ?? 2, caution: o.caution,
})

const SEAT: Equip[] = ['chair', 'sofa', 'bench']

export const EXERCISES: Exercise[] = [
  // ——— Жим горизонтальный ———
  E('bench_press', ['Жим штанги лёжа', 'Barbell bench press', 'Potisak šipke sa klupe'], 'push_h', 'wr', 92,
    ['chest'], ['triceps', 'shoulders'], [['barbell'], ['bench']], [
      ['Лопатки сведены, стопы упираются в пол', 'Shoulder blades pinched, feet planted', 'Lopatice skupljene, stopala čvrsto na podu'],
      ['Опусти гриф к низу груди под контролем', 'Lower the bar to your lower chest under control', 'Spusti šipku do donjeg dela grudi kontrolisano'],
      ['Выжми вверх, не отрывая таз от скамьи', 'Press up without lifting your hips', 'Potisni gore ne odvajajući karlicu od klupe'],
    ], { small: false, level: 2 }),
  E('db_bench', ['Жим гантелей лёжа', 'Dumbbell bench press', 'Potisak bučicama sa klupe'], 'push_h', 'wr', 82,
    ['chest'], ['triceps', 'shoulders'], [['dumbbell'], ['bench']], [
      ['Гантели над грудью, локти под углом 45°', 'Dumbbells over chest, elbows at 45°', 'Bučice iznad grudi, laktovi pod 45°'],
      ['Опускай до лёгкого растяжения в груди', 'Lower until you feel a light stretch', 'Spuštaj do blagog istezanja grudi'],
      ['Выжимай, сводя гантели над собой', 'Press and bring the dumbbells together', 'Potiskuj i spoji bučice iznad sebe'],
    ], { small: false }),
  E('db_floor_press', ['Жим гантелей лёжа на полу', 'Dumbbell floor press', 'Potisak bučicama na podu'], 'push_h', 'wr', 62,
    ['chest'], ['triceps'], [['dumbbell']], [
      ['Ляг на пол, колени согнуты', 'Lie on the floor, knees bent', 'Lezi na pod, kolena savijena'],
      ['Опускай, пока плечи не коснутся пола', 'Lower until your upper arms touch the floor', 'Spuštaj dok nadlaktice ne dodirnu pod'],
      ['Выжми вверх без рывка', 'Press up without bouncing', 'Potisni gore bez trzaja'],
    ]),
  E('machine_chest_press', ['Жим в тренажёре', 'Machine chest press', 'Potisak na mašini'], 'push_h', 'wr', 70,
    ['chest'], ['triceps', 'shoulders'], [['machine']], [
      ['Настрой сиденье: рукояти на уровне груди', 'Set the seat so handles are at chest height', 'Podesi sedište: ručke u visini grudi'],
      ['Выжми, не выпрямляя локти до щелчка', 'Press without locking your elbows hard', 'Potisni bez naglog zaključavanja laktova'],
      ['Возвращай медленно, 2–3 секунды', 'Return slowly, 2–3 seconds', 'Vraćaj polako, 2–3 sekunde'],
    ], { small: false, level: 1 }),
  E('pushup_wall', ['Отжимания от стены', 'Wall push-ups', 'Sklekovi uz zid'], 'push_h', 'r', 20,
    ['chest'], ['triceps', 'shoulders'], [], [
      ['Встань на шаг от стены, ладони на уровне плеч', 'Stand a step from the wall, palms at shoulder height', 'Stani korak od zida, dlanovi u visini ramena'],
      ['Тело прямое, опускайся грудью к стене', 'Keep your body straight, bring chest to the wall', 'Telo pravo, spuštaj grudi ka zidu'],
      ['Оттолкнись до прямых рук', 'Push back to straight arms', 'Odgurni se do opruženih ruku'],
    ], { level: 1 }),
  E('pushup_incline', ['Отжимания от стола', 'Incline push-ups', 'Sklekovi sa povišenja'], 'push_h', 'r', 22,
    ['chest'], ['triceps', 'shoulders'], [], [
      ['Руки на край устойчивого стола или подоконника', 'Hands on a sturdy table or windowsill', 'Ruke na ivicu stabilnog stola ili prozorske daske'],
      ['Тело одной линией от головы до пяток', 'One straight line from head to heels', 'Telo u jednoj liniji od glave do peta'],
      ['Касайся края грудью и выжимай', 'Touch the edge with your chest and press', 'Dodirni ivicu grudima i potisni'],
    ], { level: 1 }),
  E('pushup_knee', ['Отжимания с колен', 'Knee push-ups', 'Sklekovi na kolenima'], 'push_h', 'r', 24,
    ['chest'], ['triceps', 'shoulders'], [], [
      ['Колени на полу, ладони чуть шире плеч', 'Knees down, palms slightly wider than shoulders', 'Kolena na podu, dlanovi malo šire od ramena'],
      ['Опускайся до 5 см от пола', 'Lower to 5 cm above the floor', 'Spusti se do 5 cm od poda'],
      ['Таз не проваливается, пресс напряжён', 'Hips stay up, abs tight', 'Karlica ne propada, stomak zategnut'],
    ], { level: 1 }),
  E('pushup', ['Отжимания', 'Push-ups', 'Sklekovi'], 'push_h', 'r', 30,
    ['chest'], ['triceps', 'shoulders', 'abs'], [], [
      ['Ладони под плечами, тело прямое', 'Palms under shoulders, body straight', 'Dlanovi ispod ramena, telo pravo'],
      ['Локти идут назад под 45°', 'Elbows travel back at 45°', 'Laktovi idu unazad pod 45°'],
      ['Грудь почти касается пола — и вверх', 'Chest nearly touches the floor, then up', 'Grudi skoro dodirnu pod — pa gore'],
    ]),
  E('pushup_close', ['Узкие отжимания', 'Close-grip push-ups', 'Uski sklekovi'], 'push_h', 'r', 32,
    ['triceps', 'chest'], ['shoulders'], [], [
      ['Ладони под грудью, почти касаются', 'Palms under your chest, nearly touching', 'Dlanovi ispod grudi, skoro se dodiruju'],
      ['Локти прижаты к корпусу', 'Elbows tight to your body', 'Laktovi priljubljeni uz telo'],
      ['Опускайся медленно, выжимай мощно', 'Lower slowly, press powerfully', 'Spuštaj polako, potiskuj snažno'],
    ], { level: 3 }),
  E('pushup_clap', ['Отжимания с хлопком', 'Clap push-ups', 'Sklekovi sa pljeskom'], 'push_h', 'r', 33,
    ['chest'], ['triceps', 'shoulders'], [], [
      ['Начни как обычное отжимание', 'Start like a regular push-up', 'Počni kao običan sklek'],
      ['Оттолкнись так, чтобы ладони оторвались', 'Push hard so your palms leave the floor', 'Odgurni se da dlanovi napuste pod'],
      ['Хлопни и мягко приземлись на согнутые руки', 'Clap and land softly on bent arms', 'Pljesni i meko doskoči na savijene ruke'],
    ], { quiet: false, level: 4 }),
  E('pushup_archer', ['Отжимания лучника', 'Archer push-ups', 'Streličarski sklekovi'], 'push_h', 'r', 34,
    ['chest'], ['triceps', 'shoulders'], [], [
      ['Руки широко, одна прямая в сторону', 'Hands wide, one arm straight out', 'Ruke široko, jedna opružena u stranu'],
      ['Опускайся к согнутой руке', 'Lower toward the bending arm', 'Spuštaj se ka savijenoj ruci'],
      ['Чередуй стороны', 'Alternate sides', 'Naizmenično menjaj strane'],
    ], { level: 4 }),
  E('pushup_one_arm', ['Отжимания на одной руке', 'One-arm push-ups', 'Sklekovi na jednoj ruci'], 'push_h', 'r', 35,
    ['chest'], ['triceps', 'shoulders', 'obliques'], [], [
      ['Ноги шире, свободная рука за спиной', 'Feet wide, free hand behind your back', 'Noge šire, slobodna ruka iza leđa'],
      ['Не разворачивай корпус', 'Keep your torso square', 'Ne okreći trup'],
      ['Опускайся медленно, сколько получается', 'Lower slowly as far as you control', 'Spuštaj se polako koliko kontrolišeš'],
    ], { level: 5 }),
  E('dips', ['Отжимания на брусьях', 'Parallel bar dips', 'Propadanja na razboju'], 'push_h', 'r', 74,
    ['chest', 'triceps'], ['shoulders'], [['dip_bars']], [
      ['Повисни на прямых руках, плечи вниз', 'Support on straight arms, shoulders down', 'Oslonac na opružene ruke, ramena dole'],
      ['Опускайся до прямого угла в локтях', 'Lower until elbows reach 90°', 'Spusti se do 90° u laktovima'],
      ['Выжимай вверх без раскачки', 'Press up without swinging', 'Potisni gore bez ljuljanja'],
    ], { small: false, level: 3 }),
  E('bench_dips', ['Обратные отжимания от стула', 'Bench dips', 'Obrnuti sklekovi sa stolice'], 'triceps', 'r', 40,
    ['triceps'], ['chest', 'shoulders'], [SEAT], [
      ['Ладони на край устойчивого стула или дивана', 'Palms on the edge of a sturdy chair or sofa', 'Dlanovi na ivicu stabilne stolice ili sofe'],
      ['Опускай таз вниз, локти назад', 'Lower your hips, elbows back', 'Spuštaj karlicu, laktovi unazad'],
      ['Выпрями руки, не задирая плечи', 'Straighten your arms, shoulders down', 'Opruži ruke, ramena dole'],
    ], { level: 1 }),
  E('cable_fly', ['Сведение в кроссовере', 'Cable fly', 'Razvlačenje na sajli'], 'push_h', 'wr', 46,
    ['chest'], ['shoulders'], [['cable']], [
      ['Шаг вперёд, руки слегка согнуты', 'Step forward, arms slightly bent', 'Korak napred, ruke blago savijene'],
      ['Своди руки дугой перед грудью', 'Bring hands together in an arc', 'Spoji ruke u luku ispred grudi'],
      ['Разводи медленно до растяжения', 'Open slowly to a stretch', 'Polako raširi do istezanja'],
    ], { small: false }),
  E('db_fly', ['Разводка гантелей', 'Dumbbell fly', 'Razvlačenje bučicama'], 'push_h', 'wr', 44,
    ['chest'], ['shoulders'], [['dumbbell'], ['bench']], [
      ['Гантели над грудью, локти мягкие', 'Dumbbells over chest, soft elbows', 'Bučice iznad grudi, laktovi mekani'],
      ['Разводи в стороны до растяжения', 'Open wide to a stretch', 'Širi u stranu do istezanja'],
      ['Своди той же дугой', 'Close along the same arc', 'Spajaj istim lukom'],
    ], { small: false }),

  // ——— Жим вертикальный и плечи ———
  E('ohp', ['Жим штанги стоя', 'Overhead press', 'Potisak šipke iznad glave'], 'push_v', 'wr', 86,
    ['shoulders'], ['triceps', 'abs'], [['barbell']], [
      ['Гриф на ключицах, ягодицы и пресс напряжены', 'Bar on collarbones, glutes and abs tight', 'Šipka na ključnim kostima, gluteusi i stomak zategnuti'],
      ['Выжимай вертикально, голову чуть назад', 'Press straight up, head slightly back', 'Potiskuj pravo gore, glavu malo unazad'],
      ['Наверху голова проходит под гриф', 'At the top, head moves under the bar', 'Gore glava prolazi ispod šipke'],
    ], { small: false, level: 3 }),
  E('db_shoulder_press', ['Жим гантелей сидя', 'Seated dumbbell press', 'Potisak bučicama sedeći'], 'push_v', 'wr', 76,
    ['shoulders'], ['triceps'], [['dumbbell']], [
      ['Гантели у плеч, спина прижата', 'Dumbbells at shoulders, back supported', 'Bučice kod ramena, leđa oslonjena'],
      ['Выжимай вверх, не стукая гантели', 'Press up without clanking them', 'Potiskuj gore bez udaranja bučica'],
      ['Опускай до уровня ушей', 'Lower to ear level', 'Spuštaj do visine ušiju'],
    ]),
  E('pike_pushup', ['Отжимания уголком', 'Pike push-ups', 'Sklekovi u obliku slova V'], 'push_v', 'r', 50,
    ['shoulders'], ['triceps'], [], [
      ['Таз вверх, тело буквой Л', 'Hips high, body in an upside-down V', 'Karlica gore, telo kao obrnuto V'],
      ['Опускай макушку к полу между ладонями', 'Lower the top of your head between your hands', 'Spuštaj teme ka podu između dlanova'],
      ['Выжимай обратно, локти назад', 'Press back up, elbows back', 'Potisni nazad, laktovi unazad'],
    ], { level: 3 }),
  E('band_press', ['Жим резинки над головой', 'Band overhead press', 'Potisak gume iznad glave'], 'push_v', 'r', 40,
    ['shoulders'], ['triceps'], [['band']], [
      ['Встань на середину резинки', 'Stand on the middle of the band', 'Stani na sredinu gume'],
      ['Выжимай руки вверх', 'Press your hands overhead', 'Potiskuj ruke iznad glave'],
      ['Опускай медленно к плечам', 'Lower slowly to your shoulders', 'Spuštaj polako do ramena'],
    ], { level: 1 }),
  E('lateral_raise', ['Махи гантелями в стороны', 'Lateral raise', 'Odručenje bučicama'], 'delts', 'wr', 45,
    ['shoulders'], [], [['dumbbell']], [
      ['Лёгкий наклон вперёд, локти мягкие', 'Slight forward lean, soft elbows', 'Blagi pretklon, laktovi mekani'],
      ['Поднимай до уровня плеч', 'Raise to shoulder height', 'Podiži do visine ramena'],
      ['Опускай за 2–3 секунды', 'Lower over 2–3 seconds', 'Spuštaj 2–3 sekunde'],
    ], { level: 1 }),
  E('bottle_lateral_raise', ['Махи бутылками в стороны', 'Bottle lateral raise', 'Odručenje flašama'], 'delts', 'r', 30,
    ['shoulders'], [], [['bottles']], [
      ['Возьми по полной бутылке воды', 'Hold a full water bottle in each hand', 'Uzmi punu flašu vode u svaku ruku'],
      ['Поднимай в стороны до плеч', 'Raise out to shoulder height', 'Podiži u stranu do ramena'],
      ['Медленно опускай', 'Lower slowly', 'Polako spuštaj'],
    ], { level: 1 }),

  // ——— Тяга вертикальная ———
  E('pullup', ['Подтягивания', 'Pull-ups', 'Zgibovi'], 'pull_v', 'r', 90,
    ['lats'], ['biceps', 'traps', 'forearms'], [['pullup_bar']], [
      ['Хват чуть шире плеч, повисни', 'Grip slightly wider than shoulders, hang', 'Hvat malo šire od ramena, vis'],
      ['Тяни грудь к перекладине, локти вниз', 'Pull your chest to the bar, elbows down', 'Vuci grudi ka vratilu, laktovi dole'],
      ['Опускайся до прямых рук', 'Lower to straight arms', 'Spusti se do opruženih ruku'],
    ], { small: false, level: 3 }),
  E('chinup', ['Подтягивания обратным хватом', 'Chin-ups', 'Zgibovi podhvatom'], 'pull_v', 'r', 84,
    ['lats', 'biceps'], ['forearms'], [['pullup_bar']], [
      ['Ладони к себе, на ширине плеч', 'Palms facing you, shoulder width', 'Dlanovi ka sebi, širina ramena'],
      ['Подбородок выше перекладины', 'Chin over the bar', 'Brada iznad vratila'],
      ['Опускайся под контролем', 'Lower under control', 'Spuštaj se kontrolisano'],
    ], { small: false, level: 3 }),
  E('negative_pullup', ['Негативные подтягивания', 'Negative pull-ups', 'Negativni zgibovi'], 'pull_v', 'r', 60,
    ['lats'], ['biceps', 'forearms'], [['pullup_bar']], [
      ['Встань на стул и зафиксируй верх', 'Step up on a chair and hold the top', 'Stani na stolicu i zadrži gornji položaj'],
      ['Опускайся 3–5 секунд', 'Lower over 3–5 seconds', 'Spuštaj se 3–5 sekundi'],
      ['Снова встань наверх', 'Step back up to the top', 'Ponovo se popni gore'],
    ], { small: false, level: 2 }),
  E('lat_pulldown', ['Тяга верхнего блока', 'Lat pulldown', 'Vučenje gornjeg kolotura'], 'pull_v', 'wr', 80,
    ['lats'], ['biceps', 'traps'], [['cable', 'machine']], [
      ['Бёдра под валиком, хват шире плеч', 'Thighs under the pad, wide grip', 'Butine ispod jastuka, širok hvat'],
      ['Тяни рукоять к верху груди', 'Pull the bar to your upper chest', 'Vuci ručku do gornjeg dela grudi'],
      ['Отпускай медленно вверх', 'Let it up slowly', 'Polako vraćaj gore'],
    ], { small: false, level: 1 }),
  E('band_pulldown', ['Тяга резинки сверху', 'Band pulldown', 'Vučenje gume odozgo'], 'pull_v', 'r', 42,
    ['lats'], ['biceps'], [['band']], [
      ['Закрепи резинку высоко (дверь, турник)', 'Anchor the band high (door, bar)', 'Pričvrsti gumu visoko (vrata, vratilo)'],
      ['Тяни локти вниз к рёбрам', 'Drive your elbows down to your ribs', 'Vuci laktove dole ka rebrima'],
      ['Возвращай медленно', 'Return slowly', 'Vraćaj polako'],
    ], { level: 1 }),

  // ——— Тяга горизонтальная ———
  E('barbell_row', ['Тяга штанги в наклоне', 'Barbell row', 'Veslanje šipkom u pretklonu'], 'pull_h', 'wr', 84,
    ['lats', 'traps'], ['biceps', 'lowerback'], [['barbell']], [
      ['Наклон 45°, спина прямая', 'Hinge to 45°, back flat', 'Pretklon 45°, leđa prava'],
      ['Тяни гриф к низу живота', 'Pull the bar to your lower belly', 'Vuci šipku ka donjem delu stomaka'],
      ['Сведи лопатки наверху', 'Squeeze shoulder blades at the top', 'Skupi lopatice gore'],
    ], { small: false, level: 3 }),
  E('db_row', ['Тяга гантели в наклоне', 'One-arm dumbbell row', 'Veslanje bučicom jednom rukom'], 'pull_h', 'wr', 80,
    ['lats'], ['biceps', 'traps'], [['dumbbell']], [
      ['Опора рукой и коленом о скамью или стул', 'Brace a hand and knee on a bench or chair', 'Oslonac rukom i kolenom na klupu ili stolicu'],
      ['Тяни гантель к поясу, локоть вдоль тела', 'Row to your hip, elbow close', 'Vuci bučicu ka kuku, lakat uz telo'],
      ['Опускай до полного растяжения', 'Lower to a full stretch', 'Spuštaj do punog istezanja'],
    ], { level: 1 }),
  E('cable_row', ['Тяга нижнего блока', 'Seated cable row', 'Veslanje na donjem koloturu'], 'pull_h', 'wr', 76,
    ['lats', 'traps'], ['biceps'], [['cable', 'machine']], [
      ['Колени чуть согнуты, спина ровная', 'Knees soft, back straight', 'Kolena blago savijena, leđa prava'],
      ['Тяни к животу, грудь вперёд', 'Pull to your stomach, chest proud', 'Vuci ka stomaku, grudi napred'],
      ['Не раскачивай корпус', 'Don’t rock your torso', 'Ne ljuljaj trup'],
    ], { small: false, level: 1 }),
  E('band_row', ['Тяга резинки к поясу', 'Band row', 'Veslanje gumom'], 'pull_h', 'r', 44,
    ['lats', 'traps'], ['biceps'], [['band']], [
      ['Закрепи резинку на уровне пояса', 'Anchor the band at waist height', 'Pričvrsti gumu u visini struka'],
      ['Тяни к поясу, сводя лопатки', 'Row to your waist, squeeze blades', 'Vuci ka struku, skupi lopatice'],
      ['Возвращай медленно', 'Return slowly', 'Vraćaj polako'],
    ], { level: 1 }),
  E('superman', ['Супермен', 'Superman', 'Supermen'], 'pull_h', 'r', 18,
    ['lowerback', 'traps'], ['glutes'], [], [
      ['Ляг на живот, руки вперёд', 'Lie face down, arms forward', 'Lezi na stomak, ruke napred'],
      ['Подними руки, грудь и ноги', 'Lift arms, chest and legs', 'Podigni ruke, grudi i noge'],
      ['Задержись на 2 секунды', 'Hold for 2 seconds', 'Zadrži 2 sekunde'],
    ], { level: 1 }),
  E('reverse_snow_angel', ['Обратный снежный ангел', 'Reverse snow angel', 'Obrnuti snežni anđeo'], 'pull_h', 'r', 20,
    ['traps', 'shoulders'], ['lowerback'], [], [
      ['Лёжа на животе, руки у бёдер', 'Face down, hands by your hips', 'Na stomaku, ruke uz kukove'],
      ['Приподними руки и веди их дугой к голове', 'Lift your arms and sweep them overhead', 'Podigni ruke i vodi ih lukom iznad glave'],
      ['Верни тем же путём, не касаясь пола', 'Sweep back without touching the floor', 'Vrati istim putem bez dodira poda'],
    ], { level: 1 }),
  E('backpack_row', ['Тяга рюкзака в наклоне', 'Backpack row', 'Veslanje rancem'], 'pull_h', 'r', 36,
    ['lats', 'traps'], ['biceps'], [['backpack']], [
      ['Наполни рюкзак книгами или бутылками', 'Load a backpack with books or bottles', 'Napuni ranac knjigama ili flašama'],
      ['Наклон, спина прямая, тяни к поясу', 'Hinge, back flat, row to your waist', 'Pretklon, leđa prava, vuci ka struku'],
      ['Сведи лопатки и медленно опусти', 'Squeeze blades and lower slowly', 'Skupi lopatice i polako spusti'],
    ], { level: 1 }),
  E('table_row', ['Тяга под столом', 'Table row', 'Veslanje ispod stola'], 'pull_h', 'r', 38,
    ['lats', 'traps'], ['biceps'], [['table']], [
      ['Ляг под устойчивый стол, возьмись за край', 'Lie under a sturdy table, grip the edge', 'Lezi ispod stabilnog stola, uhvati ivicu'],
      ['Тяни грудь к краю, тело прямое', 'Pull your chest to the edge, body straight', 'Vuci grudi ka ivici, telo pravo'],
      ['Опускайся медленно', 'Lower slowly', 'Spuštaj se polako'],
    ], {
      level: 2, caution: [
        'Только очень тяжёлый и устойчивый стол. Сначала проверь, не опрокидывается ли он.',
        'Only a heavy, stable table. Check it can’t tip over before you start.',
        'Samo težak i stabilan sto. Prvo proveri da se ne prevrće.',
      ],
    }),

  // ——— Приседания ———
  E('back_squat', ['Приседания со штангой', 'Back squat', 'Čučanj sa šipkom'], 'squat', 'wr', 95,
    ['quads', 'glutes'], ['hamstrings', 'lowerback'], [['barbell'], ['rack']], [
      ['Гриф на трапециях, стопы на ширине плеч', 'Bar on your upper back, feet shoulder width', 'Šipka na trapezu, stopala u širini ramena'],
      ['Садись назад и вниз, колени по носкам', 'Sit back and down, knees over toes', 'Sedi unazad i dole, kolena prate prste'],
      ['Встань, давя пятками в пол', 'Stand up, driving through your heels', 'Ustani gurajući petama u pod'],
    ], { small: false, level: 3 }),
  E('goblet_squat', ['Гоблет-присед', 'Goblet squat', 'Gobleit čučanj'], 'squat', 'wr', 72,
    ['quads', 'glutes'], ['abs'], [['dumbbell', 'kettlebell']], [
      ['Держи вес у груди двумя руками', 'Hold the weight at your chest', 'Drži teg uz grudi obema rukama'],
      ['Садись глубоко между коленями', 'Sit deep between your knees', 'Sedi duboko između kolena'],
      ['Встань, спина прямая', 'Stand up, back tall', 'Ustani, leđa prava'],
    ], { level: 1 }),
  E('leg_press', ['Жим ногами', 'Leg press', 'Potisak nogama'], 'squat', 'wr', 74,
    ['quads', 'glutes'], ['hamstrings'], [['machine']], [
      ['Стопы на платформе на ширине плеч', 'Feet on the platform, shoulder width', 'Stopala na platformi u širini ramena'],
      ['Опускай платформу до 90° в коленях', 'Lower to 90° at the knees', 'Spuštaj do 90° u kolenima'],
      ['Выжимай, не выпрямляя колени до упора', 'Press without locking your knees', 'Potiskuj bez zaključavanja kolena'],
    ], { small: false, level: 1 }),
  E('squat', ['Приседания', 'Bodyweight squat', 'Čučanj'], 'squat', 'r', 30,
    ['quads', 'glutes'], ['hamstrings'], [], [
      ['Стопы на ширине плеч, руки вперёд', 'Feet shoulder width, arms forward', 'Stopala u širini ramena, ruke napred'],
      ['Садись до параллели бёдер с полом', 'Sit until your thighs are parallel', 'Sedi dok butine ne budu paralelne sa podom'],
      ['Встань, пятки не отрывай', 'Stand up, heels down', 'Ustani, pete ne odvajaj'],
    ], { level: 1 }),
  E('pause_squat', ['Приседания с паузой', 'Pause squat', 'Čučanj sa pauzom'], 'squat', 'r', 31,
    ['quads', 'glutes'], ['abs'], [], [
      ['Обычный присед до параллели', 'Squat to parallel', 'Čučni do paralele'],
      ['Замри внизу на 3 секунды', 'Hold the bottom for 3 seconds', 'Zadrži dole 3 sekunde'],
      ['Встань без рывка', 'Stand up without bouncing', 'Ustani bez trzaja'],
    ], { level: 2 }),
  E('backpack_squat', ['Приседания с рюкзаком', 'Backpack squat', 'Čučanj sa rancem'], 'squat', 'r', 40,
    ['quads', 'glutes'], ['hamstrings'], [['backpack']], [
      ['Рюкзак с грузом на спине или у груди', 'Loaded backpack on your back or chest', 'Ranac sa teretom na leđima ili ispred grudi'],
      ['Садись глубоко, корпус ровный', 'Squat deep, torso upright', 'Čučni duboko, trup uspravan'],
      ['Встань через пятки', 'Drive up through your heels', 'Ustani preko peta'],
    ], { level: 2 }),
  E('split_squat', ['Сплит-присед', 'Split squat', 'Split čučanj'], 'squat', 'r', 32,
    ['quads', 'glutes'], ['hamstrings'], [], [
      ['Широкий шаг, задняя пятка поднята', 'Long stance, back heel up', 'Dug korak, zadnja peta podignuta'],
      ['Опускай заднее колено к полу', 'Lower your back knee to the floor', 'Spuštaj zadnje koleno ka podu'],
      ['Встань, давя передней пяткой', 'Drive up through the front heel', 'Ustani preko prednje pete'],
    ], { level: 2 }),
  E('bulgarian_split_squat', ['Болгарские выпады', 'Bulgarian split squat', 'Bugarski čučanj'], 'squat', 'r', 34,
    ['quads', 'glutes'], ['hamstrings'], [SEAT], [
      ['Носок задней ноги на стуле или диване', 'Back foot on a chair or sofa', 'Prsti zadnje noge na stolici ili sofi'],
      ['Опускайся вертикально вниз', 'Drop straight down', 'Spuštaj se pravo dole'],
      ['Передняя пятка давит в пол', 'Front heel stays down', 'Prednja peta gura pod'],
    ], { level: 3 }),
  E('pistol_assisted', ['Пистолетик с опорой', 'Assisted pistol squat', 'Pištolj čučanj uz oslonac'], 'squat', 'r', 35,
    ['quads', 'glutes'], ['abs'], [], [
      ['Держись за дверной косяк или стол', 'Hold a door frame or table', 'Drži se za dovratak ili sto'],
      ['Одна нога вперёд, садись на другой', 'One leg forward, squat on the other', 'Jedna noga napred, čučni na drugoj'],
      ['Помогай руками ровно столько, сколько нужно', 'Help with your arms only as needed', 'Pomaži rukama samo koliko treba'],
    ], { level: 4 }),
  E('pistol', ['Пистолетик', 'Pistol squat', 'Pištolj čučanj'], 'squat', 'r', 36,
    ['quads', 'glutes'], ['abs', 'calves'], [], [
      ['Свободная нога прямая вперёд', 'Free leg straight out front', 'Slobodna noga opružena napred'],
      ['Садись полностью на одной ноге', 'Squat all the way down on one leg', 'Čučni do kraja na jednoj nozi'],
      ['Встань без опоры', 'Stand up without support', 'Ustani bez oslonca'],
    ], { level: 5 }),
  E('jump_squat', ['Приседания с выпрыгиванием', 'Jump squat', 'Čučanj sa skokom'], 'cardio', 'r', 30,
    ['quads', 'glutes'], ['calves'], [], [
      ['Присед до параллели', 'Squat to parallel', 'Čučni do paralele'],
      ['Мощно выпрыгни вверх', 'Jump up explosively', 'Eksplozivno skoči gore'],
      ['Приземляйся мягко в присед', 'Land softly into the next squat', 'Doskoči meko u sledeći čučanj'],
    ], { quiet: false, level: 2 }),

  // ——— Наклоны и ягодицы ———
  E('deadlift', ['Становая тяга', 'Deadlift', 'Mrtvo dizanje'], 'hinge', 'wr', 94,
    ['hamstrings', 'glutes', 'lowerback'], ['traps', 'forearms', 'quads'], [['barbell']], [
      ['Гриф над серединой стопы, спина прямая', 'Bar over mid-foot, back flat', 'Šipka iznad sredine stopala, leđa prava'],
      ['Толкай пол ногами, гриф скользит по ногам', 'Push the floor away, bar close to legs', 'Guraj pod nogama, šipka klizi uz noge'],
      ['Наверху выпрямись, не прогибаясь назад', 'Stand tall without leaning back', 'Gore se uspravi bez zabacivanja'],
    ], { small: false, level: 3 }),
  E('rdl', ['Румынская тяга', 'Romanian deadlift', 'Rumunsko mrtvo dizanje'], 'hinge', 'wr', 86,
    ['hamstrings', 'glutes'], ['lowerback'], [['barbell']], [
      ['Колени чуть согнуты и не двигаются', 'Knees slightly bent and fixed', 'Kolena blago savijena i fiksirana'],
      ['Отводи таз назад, гриф вдоль ног', 'Push hips back, bar along your legs', 'Guraj karlicu unazad, šipka uz noge'],
      ['Вернись за счёт ягодиц', 'Return by squeezing your glutes', 'Vrati se stezanjem gluteusa'],
    ], { small: false, level: 2 }),
  E('db_rdl', ['Румынская тяга с гантелями', 'Dumbbell Romanian deadlift', 'Rumunsko mrtvo dizanje bučicama'], 'hinge', 'wr', 76,
    ['hamstrings', 'glutes'], ['lowerback'], [['dumbbell']], [
      ['Гантели у бёдер, колени мягкие', 'Dumbbells at thighs, soft knees', 'Bučice uz butine, kolena mekana'],
      ['Наклон с отведением таза назад', 'Hinge by pushing hips back', 'Pretklon guranjem karlice unazad'],
      ['Выпрямись, сжимая ягодицы', 'Stand up squeezing your glutes', 'Uspravi se stežući gluteuse'],
    ]),
  E('kb_swing', ['Махи гирей', 'Kettlebell swing', 'Zamasi kettlebellom'], 'hinge', 'wr', 66,
    ['glutes', 'hamstrings'], ['lowerback', 'shoulders'], [['kettlebell']], [
      ['Гиря между ног, наклон с прямой спиной', 'Bell between legs, flat-back hinge', 'Teg između nogu, pretklon pravih leđa'],
      ['Резко выпрямись тазом', 'Snap your hips forward', 'Naglo ispruži kukove'],
      ['Гиря взлетает до уровня груди', 'Let the bell float to chest height', 'Teg leti do visine grudi'],
    ], { quiet: false, small: false, level: 2 }),
  E('glute_bridge', ['Ягодичный мост', 'Glute bridge', 'Glute most'], 'hinge', 'r', 34,
    ['glutes'], ['hamstrings'], [], [
      ['Лёжа на спине, стопы у таза', 'On your back, feet near your hips', 'Na leđima, stopala blizu karlice'],
      ['Подними таз, сжимая ягодицы', 'Lift your hips, squeeze your glutes', 'Podigni karlicu, stegni gluteuse'],
      ['Задержись на секунду наверху', 'Pause for a second at the top', 'Zadrži sekundu gore'],
    ], { level: 1 }),
  E('single_leg_bridge', ['Мост на одной ноге', 'Single-leg glute bridge', 'Most na jednoj nozi'], 'hinge', 'r', 36,
    ['glutes'], ['hamstrings', 'abs'], [], [
      ['Одна нога выпрямлена вверх', 'One leg straight up', 'Jedna noga opružena gore'],
      ['Поднимай таз опорной ногой', 'Lift your hips with the planted leg', 'Podiži karlicu oslonom nogom'],
      ['Таз не заваливается в сторону', 'Keep your hips level', 'Karlica ostaje ravna'],
    ], { level: 2 }),
  E('hip_thrust', ['Ягодичный мост от дивана', 'Hip thrust', 'Hip thrust sa sofe'], 'hinge', 'r', 40,
    ['glutes'], ['hamstrings'], [SEAT], [
      ['Лопатки на краю дивана или скамьи', 'Upper back on a sofa or bench edge', 'Lopatice na ivici sofe ili klupe'],
      ['Подними таз до прямой линии', 'Drive hips up to a straight line', 'Podigni karlicu u pravu liniju'],
      ['Можно положить рюкзак на таз', 'Add a backpack on your hips for load', 'Možeš staviti ranac na karlicu'],
    ], { level: 2 }),

  // ——— Выпады ———
  E('reverse_lunge', ['Выпады назад', 'Reverse lunge', 'Iskorak unazad'], 'lunge', 'r', 46,
    ['quads', 'glutes'], ['hamstrings'], [], [
      ['Шагни назад, опуская колено к полу', 'Step back, lowering your knee to the floor', 'Zakorači unazad, spuštaj koleno ka podu'],
      ['Корпус прямо, переднее колено над стопой', 'Torso tall, front knee over the foot', 'Trup uspravan, prednje koleno iznad stopala'],
      ['Вернись и смени ногу', 'Step back in and switch legs', 'Vrati se i promeni nogu'],
    ], { level: 1 }),
  E('db_lunge', ['Выпады с гантелями', 'Dumbbell lunge', 'Iskorak sa bučicama'], 'lunge', 'wr', 66,
    ['quads', 'glutes'], ['hamstrings'], [['dumbbell']], [
      ['Гантели в опущенных руках', 'Dumbbells at your sides', 'Bučice u spuštenim rukama'],
      ['Шаг вперёд, колено к полу', 'Step forward, knee toward the floor', 'Korak napred, koleno ka podu'],
      ['Оттолкнись передней ногой', 'Push back with the front leg', 'Odgurni se prednjom nogom'],
    ], { small: false }),
  E('step_up', ['Зашагивания на стул', 'Step-ups', 'Penjanje na stolicu'], 'lunge', 'r', 44,
    ['quads', 'glutes'], ['calves'], [['chair', 'bench']], [
      ['Стопа полностью на устойчивом стуле', 'Whole foot on a sturdy chair', 'Celo stopalo na stabilnoj stolici'],
      ['Встань, не отталкиваясь нижней ногой', 'Step up without pushing off the lower leg', 'Popni se bez odgurivanja donjom nogom'],
      ['Опускайся медленно', 'Step down slowly', 'Silazi polako'],
    ], { level: 1 }),

  // ——— Кор ———
  E('plank', ['Планка', 'Plank', 'Plank'], 'core', 't', 40,
    ['abs'], ['shoulders', 'glutes'], [], [
      ['Локти под плечами, тело прямое', 'Elbows under shoulders, body straight', 'Laktovi ispod ramena, telo pravo'],
      ['Сожми ягодицы и пресс', 'Squeeze glutes and abs', 'Stegni gluteuse i stomak'],
      ['Дыши ровно, таз не проваливается', 'Breathe steadily, hips stay level', 'Diši ravnomerno, karlica ne propada'],
    ], { level: 1 }),
  E('side_plank', ['Боковая планка', 'Side plank', 'Bočni plank'], 'core', 't', 41,
    ['obliques'], ['abs', 'shoulders'], [], [
      ['Локоть под плечом, ноги вместе', 'Elbow under shoulder, legs stacked', 'Lakat ispod ramena, noge zajedno'],
      ['Подними таз в прямую линию', 'Lift your hips into a straight line', 'Podigni karlicu u pravu liniju'],
      ['Держи время на каждую сторону', 'Hold the time on each side', 'Drži vreme na svaku stranu'],
    ], { level: 2 }),
  E('hollow_hold', ['Лодочка', 'Hollow hold', 'Čamac'], 'core', 't', 42,
    ['abs'], [], [], [
      ['Поясница прижата к полу', 'Lower back pressed to the floor', 'Donji deo leđa pritisnut uz pod'],
      ['Подними плечи и прямые ноги', 'Lift shoulders and straight legs', 'Podigni ramena i opružene noge'],
      ['Держи, не отрывая поясницу', 'Hold without arching', 'Drži bez odvajanja leđa'],
    ], { level: 3 }),
  E('leg_raise', ['Подъёмы ног лёжа', 'Lying leg raise', 'Podizanje nogu u ležanju'], 'core', 'r', 43,
    ['abs'], [], [], [
      ['Лёжа на спине, руки вдоль тела', 'On your back, arms by your sides', 'Na leđima, ruke uz telo'],
      ['Поднимай прямые ноги до вертикали', 'Raise straight legs to vertical', 'Podiži opružene noge do vertikale'],
      ['Опускай медленно, не касаясь пола', 'Lower slowly without touching the floor', 'Spuštaj polako bez dodira poda'],
    ], { level: 3 }),
  E('hanging_leg_raise', ['Подъёмы ног в висе', 'Hanging leg raise', 'Podizanje nogu u visu'], 'core', 'r', 60,
    ['abs'], ['forearms'], [['pullup_bar']], [
      ['Повисни на перекладине без раскачки', 'Hang from the bar without swinging', 'Vis na vratilu bez ljuljanja'],
      ['Поднимай ноги до горизонтали или выше', 'Raise legs to horizontal or higher', 'Podiži noge do horizontale ili više'],
      ['Опускай под контролем', 'Lower with control', 'Spuštaj kontrolisano'],
    ], { small: false, level: 4 }),
  E('dead_bug', ['Мёртвый жук', 'Dead bug', 'Mrtva buba'], 'core', 'r', 38,
    ['abs'], ['obliques'], [], [
      ['Лёжа на спине, руки и колени вверх', 'On your back, arms and knees up', 'Na leđima, ruke i kolena gore'],
      ['Опускай противоположные руку и ногу', 'Lower opposite arm and leg', 'Spuštaj suprotnu ruku i nogu'],
      ['Поясница всё время прижата', 'Keep your lower back down', 'Donji deo leđa stalno uz pod'],
    ], { level: 1 }),
  E('mountain_climber', ['Скалолаз', 'Mountain climbers', 'Planinar'], 'cardio', 't', 30,
    ['abs'], ['shoulders', 'quads'], [], [
      ['Упор лёжа на прямых руках', 'High plank on straight arms', 'Upor na opruženim rukama'],
      ['Быстро подтягивай колени к груди', 'Drive knees to chest quickly', 'Brzo privlači kolena ka grudima'],
      ['Таз не поднимается', 'Keep hips down', 'Karlica ne ide gore'],
    ], { quiet: false, level: 2 }),

  // ——— Руки ———
  E('barbell_curl', ['Подъём штанги на бицепс', 'Barbell curl', 'Pregib šipkom'], 'biceps', 'wr', 70,
    ['biceps'], ['forearms'], [['barbell']], [
      ['Локти прижаты к бокам', 'Elbows pinned to your sides', 'Laktovi uz telo'],
      ['Сгибай без раскачки корпусом', 'Curl without swinging', 'Savijaj bez ljuljanja'],
      ['Опускай до прямых рук', 'Lower to straight arms', 'Spuštaj do opruženih ruku'],
    ], { level: 1 }),
  E('db_curl', ['Сгибания с гантелями', 'Dumbbell curl', 'Pregib bučicama'], 'biceps', 'wr', 68,
    ['biceps'], ['forearms'], [['dumbbell']], [
      ['Ладони вперёд, локти неподвижны', 'Palms forward, elbows still', 'Dlanovi napred, laktovi mirni'],
      ['Поднимай к плечам', 'Curl to your shoulders', 'Podiži ka ramenima'],
      ['Опускай за 2–3 секунды', 'Lower over 2–3 seconds', 'Spuštaj 2–3 sekunde'],
    ], { level: 1 }),
  E('band_curl', ['Сгибания с резинкой', 'Band curl', 'Pregib gumom'], 'biceps', 'r', 42,
    ['biceps'], ['forearms'], [['band']], [
      ['Встань на резинку', 'Stand on the band', 'Stani na gumu'],
      ['Сгибай руки, локти у корпуса', 'Curl with elbows at your sides', 'Savijaj ruke, laktovi uz telo'],
      ['Возвращай медленно', 'Return slowly', 'Vraćaj polako'],
    ], { level: 1 }),
  E('backpack_curl', ['Сгибания с рюкзаком', 'Backpack curl', 'Pregib sa rancem'], 'biceps', 'r', 32,
    ['biceps'], ['forearms'], [['backpack']], [
      ['Возьми рюкзак за лямки', 'Hold the backpack by its straps', 'Uhvati ranac za kaiševe'],
      ['Сгибай руки к груди', 'Curl it to your chest', 'Savijaj ruke ka grudima'],
      ['Опускай без рывка', 'Lower without dropping it', 'Spuštaj bez trzaja'],
    ], { level: 1 }),
  E('tricep_pushdown', ['Разгибания на блоке', 'Triceps pushdown', 'Ekstenzija na sajli'], 'triceps', 'wr', 66,
    ['triceps'], [], [['cable']], [
      ['Локти прижаты к бокам', 'Elbows pinned to your sides', 'Laktovi uz telo'],
      ['Разгибай руки вниз до конца', 'Press down to full extension', 'Opruži ruke skroz dole'],
      ['Возвращай до прямого угла', 'Return to 90°', 'Vraćaj do 90°'],
    ], { small: false, level: 1 }),
  E('overhead_db_ext', ['Разгибание гантели из-за головы', 'Overhead dumbbell extension', 'Ekstenzija bučice iza glave'], 'triceps', 'wr', 60,
    ['triceps'], [], [['dumbbell']], [
      ['Гантель над головой двумя руками', 'Dumbbell overhead with both hands', 'Bučica iznad glave obema rukama'],
      ['Опускай за голову, локти вверх', 'Lower behind your head, elbows up', 'Spuštaj iza glave, laktovi gore'],
      ['Разгибай до прямых рук', 'Extend to straight arms', 'Opruži do pravih ruku'],
    ], { level: 1 }),

  // ——— Икры и кардио ———
  E('calf_raise', ['Подъёмы на носки', 'Calf raise', 'Podizanje na prste'], 'calves', 'r', 30,
    ['calves'], [], [], [
      ['Носки на краю ступеньки или книги', 'Toes on the edge of a step or book', 'Prsti na ivici stepenika ili knjige'],
      ['Поднимись как можно выше', 'Rise as high as you can', 'Podigni se što više'],
      ['Опустись ниже уровня опоры', 'Lower below the edge', 'Spusti se ispod ivice'],
    ], { level: 1 }),
  E('single_calf_raise', ['Подъёмы на носок одной ногой', 'Single-leg calf raise', 'Podizanje na prste jednom nogom'], 'calves', 'r', 32,
    ['calves'], [], [], [
      ['Держись рукой за стену', 'Hold a wall for balance', 'Drži se za zid'],
      ['Поднимись на одной ноге', 'Rise on one leg', 'Podigni se na jednoj nozi'],
      ['Опускайся медленно', 'Lower slowly', 'Spuštaj se polako'],
    ], { level: 2 }),
  E('burpee', ['Бёрпи', 'Burpee', 'Burpi'], 'cardio', 'r', 34,
    ['quads', 'chest'], ['abs', 'shoulders'], [], [
      ['Присядь и поставь ладони на пол', 'Squat and place your hands down', 'Čučni i stavi dlanove na pod'],
      ['Отпрыгни в упор лёжа и вернись', 'Jump back to a plank and return', 'Skoči u upor i vrati se'],
      ['Выпрыгни вверх', 'Jump up', 'Skoči gore'],
    ], { quiet: false, level: 3 }),
  E('march_in_place', ['Шаг на месте с высоким коленом', 'High-knee march', 'Marš u mestu'], 'cardio', 't', 26,
    ['quads'], ['abs', 'calves'], [], [
      ['Поднимай колено до уровня пояса', 'Lift each knee to hip height', 'Podiži koleno do visine kuka'],
      ['Работай руками в такт', 'Swing your arms in rhythm', 'Radi rukama u ritmu'],
      ['Темп ровный, без прыжков', 'Steady pace, no jumping', 'Ravnomeran tempo, bez skokova'],
    ], { level: 1 }),
  E('run', ['Бег', 'Run', 'Trčanje'], 'cardio', 't', 40,
    ['quads', 'calves'], ['hamstrings', 'glutes'], [], [
      ['Начни с 5 минут спокойного темпа', 'Start with 5 easy minutes', 'Počni sa 5 minuta laganog tempa'],
      ['Дыши так, чтобы мог говорить', 'Keep a pace where you can talk', 'Tempo pri kom možeš da pričaš'],
      ['Заверши лёгким шагом', 'Finish with an easy walk', 'Završi laganim hodom'],
    ], { quiet: false, small: false, level: 1 }),
]

export const EX_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))
