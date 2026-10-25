import pathlib
d=pathlib.Path(__file__).parent
page=(d/'page.html').read_text()
for ph,f in [('/*__DATA__*/','data.js'),('/*__DATA2__*/','data2.js'),('/*__DATA3__*/','data3.js'),('/*__DATA4__*/','data4.js'),('/*__SCENES__*/','scenes.js'),('/*__APP__*/','app.js')]:
    page=page.replace(ph,(d/f).read_text())
(d/'por-fin-apto.html').write_text(page)
print(len(page))
