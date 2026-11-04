/* Хранилище Бюро: профиль семьи и сохранения дел в localStorage. Без хранилища игра тоже работает (в памяти). */
(function () {
  const B = (window.Bureau = window.Bureau || {});
  const mem = {};
  function read(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return mem[k] ? JSON.parse(mem[k]) : null; }
  }
  function write(k, v) {
    const s = JSON.stringify(v);
    mem[k] = s;
    try { localStorage.setItem(k, s); } catch (e) { /* приватный режим: остаётся в памяти */ }
  }
  function del(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }

  const PROFILE_KEY = "bureau.profile.v1";
  const ACH = {
    first: { name: "Первое дело", d: "Раскройте любое дело", ic: "1" },
    three: { name: "Три звезды", d: "Получите три звезды за дело", ic: "★" },
    nohints: { name: "Своим умом", d: "Раскройте дело без подсказок", ic: "◎" },
    council: { name: "Семейный совет", d: "Проголосуйте всей семьёй (3+ человека)", ic: "✋" },
    home: { name: "Картина дома", d: "Найдите украденную картину", ic: "▣" },
  };

  B.store = {
    ACH,
    profile() {
      return read(PROFILE_KEY) || { family: "Семья детективов", members: [], badges: {}, cases: {}, achievements: [] };
    },
    saveProfile(p) { write(PROFILE_KEY, p); },
    loadCase(id) { return read("bureau.case." + id); },
    saveCase(id, s) { write("bureau.case." + id, s); },
    clearCase(id) { del("bureau.case." + id); },
    resetAll() { del(PROFILE_KEY); del("bureau.case.blue-bird"); },
  };
})();
