from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
with sync_playwright() as p:
    chromium = os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium')
    opts = {'headless': True, 'args': ['--no-sandbox']}
    if Path(chromium).exists(): opts['executable_path'] = chromium
    browser=p.chromium.launch(**opts)
    page=browser.new_page(viewport={'width':1360,'height':820})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content((SITE / 'index.html').read_text(encoding='utf-8'),wait_until='domcontentloaded')
    page.add_style_tag(content=(SITE / 'styles.css').read_text(encoding='utf-8'))
    page.add_script_tag(content=(SITE / 'game.js').read_text(encoding='utf-8'))
    def hit(label): page.locator('#hotspots button',has_text=label).click()
    def close(): page.locator('#close-dialog').click()
    hit('Реестр прибытия')
    hit('Накладная')
    hit('УФ-фонарь')
    hit('Пульт наблюдения')
    for n in [2,4,1]: page.locator(f'#dialog-body button[data-digit="{n}"]').click()
    assert 'Тринадцатая фигура' in page.locator('#toast').inner_text() or 'Камера' in page.locator('#story').inner_text()
    hit('Выйти на перрон')
    page.locator('#nav-inventory').click();page.locator('[data-item=lamp]').click()
    hit('Следы на скамье')
    hit('Маршрутный лист')
    hit('Дежурный')
    page.locator('#ask-question').click();close()
    hit('Шкаф 17')
    page.locator('#locker-code').fill('2417');page.locator('#locker-form button').click()
    hit('Медицинский отсек')
    hit('Карта пациента')
    page.locator('#nav-inventory').click();page.locator('[data-item=cloth]').click()
    hit('Анализ ткани')
    for n in [3,1,2]: page.locator(f'#dialog-body button[data-r="{n}"]').click()
    hit('Дежурная врач');page.locator('#ask-question').click();close()
    hit('Диспетчерская')
    page.locator('#nav-inventory').click();page.locator('[data-item=pass]').click()
    hit('Журнал доступа')
    hit('Красная папка')
    def link(a,b):
        page.locator('#nav-evidence').click();page.locator('[data-tab=links]').click()
        page.locator('#board-a').select_option(a);page.locator('#board-b').select_option(b)
        page.locator('#connect').click()
        assert page.locator('#connect-feedback').get_attribute('class')=='notice success'
        close()
    for a,b in [('manifest','frame'),('fiber','clinicCard'),('dispatch','audit'),('extra','medical'),('candidate','coverup')]:link(a,b)
    assert '5/5' in page.locator('#progress').inner_text()
    hit('Диспетчер');page.locator('#ask-question').click();close()
    hit('Заключение')
    page.locator('[data-answer=right]').click()
    page.locator('#protect').click()
    assert 'Имя, которого нет' in page.locator('#dialog-title').inner_text()
    page.screenshot(path=str(ROOT / 'test-desktop.png'),full_page=True)
    assert not errors,errors
    browser.close()
    print('PASS: full detective flow, puzzles, clues, inventory, conditional interviews, 5 evidence links, ending; 0 page errors')