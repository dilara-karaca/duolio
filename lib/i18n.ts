"use client";

import { useSyncExternalStore } from "react";
import type { ColoringImageId, PuzzleImageId } from "@/games/logic/catalog";
import type { PaletteId } from "@/games/logic/palette";
import type { GameId } from "@/types";

export type Locale = "tr" | "en";

const KEY = "duolio-locale";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return "tr";
  const value = localStorage.getItem(KEY);
  return value === "en" ? "en" : "tr";
}

export function setLocale(locale: Locale) {
  localStorage.setItem(KEY, locale);
  document.documentElement.lang = locale;
  notify();
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, () => "tr" as const);
  return {
    locale,
    setLocale,
    t: messages[locale],
  };
}

const gamesTr: Record<GameId, { name: string; description: string }> = {
  coloring: { name: "Boyama", description: "Aynı tuvalde birlikte boyayın." },
  puzzle: { name: "Puzzle", description: "Aynı puzzle'ı birlikte tamamlayın." },
  "number-race": { name: "Sayı Yarışı", description: "Tahtanı doldururken sayıları bul." },
  "mouse-cheese": { name: "Fare & Peynir", description: "Hızlı tıkla ve fareyi önce sen besle." },
  bomb: { name: "Bomba", description: "Rakibin bombalarını bul, üçüncüye basma." },
  "word-race": { name: "Kelime Yarışı", description: "Harflerden rakibinden önce bir kelime oluştur." },
};

const gamesEn: Record<GameId, { name: string; description: string }> = {
  coloring: { name: "Coloring", description: "Paint together on the same canvas." },
  puzzle: { name: "Puzzle", description: "Complete one puzzle together." },
  "number-race": { name: "Number Race", description: "Find numbers while filling your board." },
  "mouse-cheese": { name: "Mouse & Cheese", description: "Click fast and feed the mouse first." },
  bomb: { name: "Bomb", description: "Find your opponent's bombs without hitting the third one." },
  "word-race": { name: "Word Race", description: "Create a word from the letters before your opponent." },
};

const tr = {
  headline: "İki oyuncu. Bir oda. Sonsuz eğlence.",
  subhead: "Bir oda oluştur, arkadaşını davet et ve oynamaya başla.",
  nickname: "Takma ad",
  createRoom: "Oda Oluştur",
  joinRoom: "Odaya Katıl",
  roomCode: "Oda kodu",
  returnToRoom: (code: string) => `Odaya dön: ${code}`,
  room: "Oda",
  copyCode: "Kodu Kopyala",
  copyInvite: "Davet Linkini Kopyala",
  copied: "Kopyalandı",
  waitingFriend: "Arkadaşın bekleniyor...",
  disconnectedShort: (name: string) => `${name} bağlantısı koptu`,
  disconnectedWait: (name: string) => `${name} bağlantısı koptu. Dönmesi bekleniyor…`,
  you: "Sen",
  reconnecting: "Yeniden bağlanıyor",
  leaveRoom: "Odadan çık",
  chooseGame: "Bir Oyun Seç",
  startGame: (name: string) => `${name} Başlat`,
  chooseAGame: "Bir oyun seç",
  lobby: "← Lobi",
  playAgain: "Tekrar Oyna",
  backToLobby: "Lobiye Dön",
  pointPlus: "+1 Puan",
  connecting: "Bağlanıyor…",
  joinPrompt: "Arkadaşına katılmak için bir takma ad gir.",
  backHome: "Ana sayfaya dön",
  roomNotFound: "Oda bulunamadı.",
  roomClosed: "Bu oda kapanmış olabilir. Oynamak için yeni bir oda oluştur.",
  switchToLight: "Açık temaya geç",
  switchToDark: "Koyu temaya geç",
  language: "Dil",
  loading: "Yükleniyor…",
  getReady: "Hazır ol",
  resultFinished: "Bitti!",
  resultPuzzle: "Puzzle Tamam! 🎉",
  resultWins: (name: string) => `${name} Kazandı!`,
  mouseHint: "Her tıklama fareyi peynirine çeker.",
  tapLeft: "Sol için tıkla",
  tapRight: "Sağ için tıkla",
  taps: (n: number) => `${n} tık`,
  bombsFound: "Bulunan bombalar",
  bombRule: "Üçüncü bombayı bulan kaybeder.",
  hideBombs: "3 bomba gizle",
  bombsSelected: (n: number) => `${n}/3 seçildi`,
  waitingFriendShort: "Arkadaşın bekleniyor…",
  starting: "Başlıyor…",
  lockBombs: "Bombaları kilitle",
  bombsLocked: "Bombalar kilitli",
  yourTurn: "Senin sıran",
  theirTurn: "Rakibin sırası",
  yourBoard: "Senin tahtan",
  yourBoardFound: (n: number) => `Senin tahtan · rakip ${n} buldu`,
  wordHint: "İki harfi de kullan. İlk geçerli kelime kazanır.",
  yourWord: "Kelimen",
  submit: "Gönder",
  numberChoose: (name: string) => `${name} için bir sayı seç`,
  numberChoosing: (name: string) => `${name} bir sayı seçiyor…`,
  numberFound: (n: number) => `${n} bulundu!`,
  numberFill: (n: number) => `Onlar ${n} ararken tahtanı doldur`,
  numberFind: (n: number) => `${n} bul`,
  eraser: "Silgi",
  undo: "Geri al",
  clear: "Temizle",
  clearConfirm: "Temizlensin mi?",
  clearAsk: "Tüm boyamalar silinsin mi?",
  clearHint: "Sayfa baştaki siyah-beyaz haline döner.",
  cancel: "Vazgeç",
  finish: "Bitir",
  coloringDoneTitle: "Boyaman tamamlandı! 🎨",
  saveImage: "Görseli Kaydet",
  colorAgain: "Tekrar Boya",
  emptyColorAsk: "Henüz boyama yapmadın. Yine de kaydetmek istiyor musun?",
  emptyColorHint: "Sayfa şu anki haliyle kaydedilir.",
  saveAnyway: "Yine de kaydet",
  palette: "Renkler",
  moreColors: "Daha fazla renk",
  classicColors: "Klasik renkler",
  pickColoringPage: "Bir resim seç",
  pickColoringHint: "Birlikte boyamak için bir sayfa seçin.",
  changeColoringPage: "Resmi değiştir",
  coloringCanvas: "Boyama sayfası",
  coloringLoadError: "Boyama sayfası yüklenemedi.",
  colors: {
    black: "Siyah",
    darkGray: "Koyu gri",
    gray: "Gri",
    white: "Beyaz",
    red: "Kırmızı",
    burgundy: "Bordo",
    crimson: "Kızıl",
    coral: "Mercan",
    orange: "Turuncu",
    lightOrange: "Açık turuncu",
    peach: "Şeftali",
    yellow: "Sarı",
    gold: "Altın sarısı",
    mustard: "Hardal",
    lightGreen: "Açık yeşil",
    lime: "Limon yeşili",
    green: "Yeşil",
    darkGreen: "Koyu yeşil",
    olive: "Zeytin yeşili",
    mint: "Nane",
    lightTeal: "Açık turkuaz",
    teal: "Turkuaz",
    seafoam: "Deniz köpüğü",
    cyan: "Camgöbeği",
    lightBlue: "Açık mavi",
    sky: "Gök mavisi",
    blue: "Mavi",
    darkBlue: "Koyu mavi",
    navy: "Lacivert",
    indigo: "Çivit",
    lightPurple: "Açık mor",
    lavender: "Lavanta",
    purple: "Mor",
    darkPurple: "Koyu mor",
    magenta: "Macenta",
    pink: "Pembe",
    lightPink: "Açık pembe",
    rose: "Gül kurusu",
    brown: "Kahverengi",
    lightBrown: "Açık kahverengi",
    chocolate: "Çikolata",
    beige: "Bej",
    sand: "Kum",
    skin: "Ten rengi",
    maroon: "Kestane",
    slate: "Arduvaz",
  },
  puzzleLocked: (n: number) => `${n}/9 kilitli`,
  puzzleHint: "Parçayı yerine sürükle. Otursa kilitlenir.",
  coloringPages: {
    arcade: "Arcade",
    astronaut: "Astronot",
    bikeRide: "Bisiklet gezisi",
    library: "Büyülü kütüphane",
    picnic: "Gece pikniği",
    tokyo: "Japon sokak",
    cafe: "Kafe",
    track: "Pist",
    squirrels: "Sincaplar",
  },
  puzzlePics: { coast: "Sahil", city: "Şehir", garden: "Bahçe" },
  games: gamesTr,
  errors: {
    nickname: "Takma ad 1–16 karakter olmalı.",
    roomCode: "6 karakterlik bir oda kodu gir.",
    notFound: "Oda bulunamadı.",
    full: "Bu oda dolu.",
    notMember: "Bu odada değilsin.",
    chooseLobby: "Lobiden bir oyun seç.",
    waitFriend: "Arkadaşının yeniden bağlanmasını bekle.",
    chooseStart: "Başlamak için bir oyun seç.",
    notRunning: "Oyun çalışmıyor.",
    paused: "Oyun duraklatıldı.",
    connecting: "Oyun sunucusuna bağlanılıyor…",
    noResponse: "Oda yanıt vermedi. Tekrar dene.",
    nothingToUndo: "Geri alınacak boyama yok.",
    pageFull: "Sayfa doldu. Devam etmek için geri al veya temizle.",
    pickColor: "Paletten bir renk seç.",
    outsidePage: "Bu nokta sayfanın dışında.",
    couldNotColor: "Bu bölge boyanamadı.",
    badPicture: "Bu resim kullanılamıyor.",
  },
} as const;

const en = {
  headline: "Two players. One room. Endless fun.",
  subhead: "Create a room, invite a friend and start playing.",
  nickname: "Nickname",
  createRoom: "Create Room",
  joinRoom: "Join Room",
  roomCode: "Room code",
  returnToRoom: (code: string) => `Return to room ${code}`,
  room: "Room",
  copyCode: "Copy Code",
  copyInvite: "Copy Invite Link",
  copied: "Copied",
  waitingFriend: "Waiting for your friend...",
  disconnectedShort: (name: string) => `${name} disconnected`,
  disconnectedWait: (name: string) => `${name} disconnected. Waiting for them to return…`,
  you: "You",
  reconnecting: "Reconnecting",
  leaveRoom: "Leave room",
  chooseGame: "Choose a Game",
  startGame: (name: string) => `Start ${name}`,
  chooseAGame: "Choose a game",
  lobby: "← Lobby",
  playAgain: "Play Again",
  backToLobby: "Back to Lobby",
  pointPlus: "+1 Point",
  connecting: "Connecting…",
  joinPrompt: "Enter a nickname to join your friend.",
  backHome: "Back home",
  roomNotFound: "Room not found.",
  roomClosed: "This room may have closed. Create a new one to play.",
  switchToLight: "Switch to light theme",
  switchToDark: "Switch to dark theme",
  language: "Language",
  loading: "Loading…",
  getReady: "Get ready",
  resultFinished: "Finished!",
  resultPuzzle: "Puzzle Complete! 🎉",
  resultWins: (name: string) => `${name} Wins!`,
  mouseHint: "Each tap pulls the mouse toward your cheese.",
  tapLeft: "Tap for the left",
  tapRight: "Tap for the right",
  taps: (n: number) => `${n} taps`,
  bombsFound: "Bombs found",
  bombRule: "Finding the third bomb loses the game.",
  hideBombs: "Hide 3 bombs",
  bombsSelected: (n: number) => `${n}/3 selected`,
  waitingFriendShort: "Waiting for your friend…",
  starting: "Starting…",
  lockBombs: "Lock bombs",
  bombsLocked: "Bombs locked",
  yourTurn: "Your turn",
  theirTurn: "Their turn",
  yourBoard: "Your board",
  yourBoardFound: (n: number) => `Your board · opponent found ${n}`,
  wordHint: "Use both letters. First valid word wins.",
  yourWord: "Your word",
  submit: "Submit",
  numberChoose: (name: string) => `Choose a number for ${name} to find`,
  numberChoosing: (name: string) => `${name} is choosing a number…`,
  numberFound: (n: number) => `Found ${n}!`,
  numberFill: (n: number) => `Fill your board while they look for ${n}`,
  numberFind: (n: number) => `Find ${n}`,
  eraser: "Eraser",
  undo: "Undo",
  clear: "Clear",
  clearConfirm: "Clear?",
  clearAsk: "Clear all the coloring?",
  clearHint: "The page returns to the original black-and-white drawing.",
  cancel: "Cancel",
  finish: "Finish",
  coloringDoneTitle: "Your coloring is done! 🎨",
  saveImage: "Save Image",
  colorAgain: "Color Again",
  emptyColorAsk: "You haven't colored anything yet. Save anyway?",
  emptyColorHint: "The page will be saved as it looks now.",
  saveAnyway: "Save anyway",
  palette: "Colors",
  moreColors: "More colors",
  classicColors: "Classic colors",
  pickColoringPage: "Pick a picture",
  pickColoringHint: "Choose a page to color together.",
  changeColoringPage: "Change picture",
  coloringCanvas: "Coloring page",
  coloringLoadError: "The coloring page could not be loaded.",
  colors: {
    black: "Black",
    darkGray: "Dark gray",
    gray: "Gray",
    white: "White",
    red: "Red",
    burgundy: "Burgundy",
    crimson: "Crimson",
    coral: "Coral",
    orange: "Orange",
    lightOrange: "Light orange",
    peach: "Peach",
    yellow: "Yellow",
    gold: "Gold",
    mustard: "Mustard",
    lightGreen: "Light green",
    lime: "Lime",
    green: "Green",
    darkGreen: "Dark green",
    olive: "Olive",
    mint: "Mint",
    lightTeal: "Light teal",
    teal: "Teal",
    seafoam: "Seafoam",
    cyan: "Cyan",
    lightBlue: "Light blue",
    sky: "Sky",
    blue: "Blue",
    darkBlue: "Dark blue",
    navy: "Navy",
    indigo: "Indigo",
    lightPurple: "Light purple",
    lavender: "Lavender",
    purple: "Purple",
    darkPurple: "Dark purple",
    magenta: "Magenta",
    pink: "Pink",
    lightPink: "Light pink",
    rose: "Rose",
    brown: "Brown",
    lightBrown: "Light brown",
    chocolate: "Chocolate",
    beige: "Beige",
    sand: "Sand",
    skin: "Skin",
    maroon: "Maroon",
    slate: "Slate",
  },
  puzzleLocked: (n: number) => `${n}/9 locked`,
  puzzleHint: "Drag a piece into its place. It locks when it fits.",
  coloringPages: {
    arcade: "Arcade",
    astronaut: "Astronaut",
    bikeRide: "Bike ride",
    library: "Magic library",
    picnic: "Night picnic",
    tokyo: "Tokyo street",
    cafe: "Cafe",
    track: "Track",
    squirrels: "Squirrels",
  },
  puzzlePics: { coast: "Coast", city: "City", garden: "Garden" },
  games: gamesEn,
  errors: {
    nickname: "Nickname must be 1–16 characters.",
    roomCode: "Enter a 6-character room code.",
    notFound: "Room not found.",
    full: "This room is full.",
    notMember: "You're not in this room.",
    chooseLobby: "Choose a game from the lobby.",
    waitFriend: "Wait for your friend to reconnect.",
    chooseStart: "Choose a game to start.",
    notRunning: "The game is not running.",
    paused: "The game is paused.",
    connecting: "Connecting to the game server…",
    noResponse: "The room did not respond. Try again.",
    nothingToUndo: "Nothing to undo.",
    pageFull: "The page is full. Undo or clear to keep coloring.",
    pickColor: "Pick a color from the palette.",
    outsidePage: "That spot is outside the page.",
    couldNotColor: "Could not color that region.",
    badPicture: "That picture is not available.",
  },
} as const;

export type Messages = {
  headline: string;
  subhead: string;
  nickname: string;
  createRoom: string;
  joinRoom: string;
  roomCode: string;
  returnToRoom: (code: string) => string;
  room: string;
  copyCode: string;
  copyInvite: string;
  copied: string;
  waitingFriend: string;
  disconnectedShort: (name: string) => string;
  disconnectedWait: (name: string) => string;
  you: string;
  reconnecting: string;
  leaveRoom: string;
  chooseGame: string;
  startGame: (name: string) => string;
  chooseAGame: string;
  lobby: string;
  playAgain: string;
  backToLobby: string;
  pointPlus: string;
  connecting: string;
  joinPrompt: string;
  backHome: string;
  roomNotFound: string;
  roomClosed: string;
  switchToLight: string;
  switchToDark: string;
  language: string;
  loading: string;
  getReady: string;
  resultFinished: string;
  resultPuzzle: string;
  resultWins: (name: string) => string;
  mouseHint: string;
  tapLeft: string;
  tapRight: string;
  taps: (n: number) => string;
  bombsFound: string;
  bombRule: string;
  hideBombs: string;
  bombsSelected: (n: number) => string;
  waitingFriendShort: string;
  starting: string;
  lockBombs: string;
  bombsLocked: string;
  yourTurn: string;
  theirTurn: string;
  yourBoard: string;
  yourBoardFound: (n: number) => string;
  wordHint: string;
  yourWord: string;
  submit: string;
  numberChoose: (name: string) => string;
  numberChoosing: (name: string) => string;
  numberFound: (n: number) => string;
  numberFill: (n: number) => string;
  numberFind: (n: number) => string;
  eraser: string;
  undo: string;
  clear: string;
  clearConfirm: string;
  clearAsk: string;
  clearHint: string;
  cancel: string;
  finish: string;
  coloringDoneTitle: string;
  saveImage: string;
  colorAgain: string;
  emptyColorAsk: string;
  emptyColorHint: string;
  saveAnyway: string;
  palette: string;
  moreColors: string;
  classicColors: string;
  pickColoringPage: string;
  pickColoringHint: string;
  changeColoringPage: string;
  coloringCanvas: string;
  coloringLoadError: string;
  colors: Record<PaletteId, string>;
  puzzleLocked: (n: number) => string;
  puzzleHint: string;
  coloringPages: Record<ColoringImageId, string>;
  puzzlePics: Record<PuzzleImageId, string>;
  games: Record<GameId, { name: string; description: string }>;
  errors: {
    nickname: string;
    roomCode: string;
    notFound: string;
    full: string;
    notMember: string;
    chooseLobby: string;
    waitFriend: string;
    chooseStart: string;
    notRunning: string;
    paused: string;
    connecting: string;
    noResponse: string;
    nothingToUndo: string;
    pageFull: string;
    pickColor: string;
    outsidePage: string;
    couldNotColor: string;
    badPicture: string;
  };
};

export const messages: Record<Locale, Messages> = { tr, en };

const errorMap: Record<string, keyof Messages["errors"]> = {
  "Nickname must be 1–16 characters.": "nickname",
  "Enter a 6-character room code.": "roomCode",
  "Room not found.": "notFound",
  "This room is full.": "full",
  "You're not in this room.": "notMember",
  "Choose a game from the lobby.": "chooseLobby",
  "Wait for your friend to reconnect.": "waitFriend",
  "Choose a game to start.": "chooseStart",
  "The game is not running.": "notRunning",
  "Connecting to the game server…": "connecting",
  "The room did not respond. Try again.": "noResponse",
  "Nothing to undo.": "nothingToUndo",
  "The page is full. Undo or clear to keep coloring.": "pageFull",
  "Pick a color from the palette.": "pickColor",
  "That spot is outside the page.": "outsidePage",
  "Could not color that region.": "couldNotColor",
  "That picture is not available.": "badPicture",
};

export function translateMessage(message: string | null | undefined, t: Messages): string | null {
  if (!message) return null;
  const key = errorMap[message];
  if (key) return t.errors[key];
  if (message.startsWith("Your word must include ")) {
    const letters = message.replace("Your word must include ", "");
    return t === messages.tr ? `Kelimen ${letters} harflerini içermeli.` : message;
  }
  if (message === "Word must be at least 2 letters.") {
    return t === messages.tr ? "Kelime en az 2 harfli olmalı." : message;
  }
  if (message === "Keep the word under 24 letters.") {
    return t === messages.tr ? "Kelime 24 harften kısa olmalı." : message;
  }
  if (message === "Use letters only.") {
    return t === messages.tr ? "Yalnızca harf kullan." : message;
  }
  if (message === "Type a word to submit.") {
    return t === messages.tr ? "Göndermek için bir kelime yaz." : message;
  }
  if (message === "This round is already over.") {
    return t === messages.tr ? "Bu tur bitti." : message;
  }
  return message;
}

export function translateResultTitle(title: string, t: Messages): string {
  if (title === "Finished!") return t.resultFinished;
  if (title === "Puzzle Complete! 🎉") return t.resultPuzzle;
  const match = title.match(/^(.+) Wins!$/);
  if (match) return t.resultWins(match[1]);
  return title;
}
