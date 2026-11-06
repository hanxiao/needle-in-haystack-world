import os
from PIL import Image, ImageDraw
def sheet(names, out, cols, cw=720, ch=450, labels=True):
    rows = (len(names)+cols-1)//cols
    im = Image.new('RGB', (cols*cw, rows*ch), (20,20,20))
    d = ImageDraw.Draw(im)
    for i,n in enumerate(names):
        p=f'qa/visual/shots/{n}.png'
        if not os.path.exists(p): continue
        im2=Image.open(p).convert('RGB').resize((cw,ch), Image.LANCZOS)
        x=(i%cols)*cw; y=(i//cols)*ch
        im.paste(im2,(x,y))
        if labels:
            d.rectangle([x,y,x+300,y+20], fill=(0,0,0))
            d.text((x+5,y+4), n, fill=(255,255,0))
    im.save(out, quality=90)
    print(out, im.size)
sheet(['f-r-living-fp-a','f-r-living-fp-b','f-r-living-fp-c','f-r-kitchen-fp-a','f-r-kitchen-fp-b','f-r-kitchen-fp-b'], 'qa/visual/r-living-kitchen.jpg', 3, 480, 300)
sheet(['f-r-bedroom-fp-a','f-r-bedroom-fp-b','f-r-bedroom-tp','f-r-bath-fp-a','f-r-bath-fp-b','f-r-bath-tp'], 'qa/visual/r-bed-bath.jpg', 3, 480, 300)
sheet(['f-r-hall-fp-a','f-r-hall-fp-b','f-r-hall-tp','f-r-study-fp-a','f-r-study-fp-b','f-r-study-tp'], 'qa/visual/r-hall-study.jpg', 3, 480, 300)
sheet(['f-r-win-living','f-r-win-kitchen','f-r-win-bedroom','f-r-win-study','f-r-front-door','f-r-needle'], 'qa/visual/r-windows.jpg', 3, 480, 300)
sheet(['f-r-held-mug','f-r-placed-mug'], 'qa/visual/r-held.jpg', 2)
