import os
from PIL import Image, ImageDraw
def sheet(names, out, cols, cw=720, ch=450):
    rows = (len(names)+cols-1)//cols
    im = Image.new('RGB', (cols*cw, rows*ch), (20,20,20)); d = ImageDraw.Draw(im)
    for i,n in enumerate(names):
        p=f'qa/visual/shots/{n}.png'
        if not os.path.exists(p): continue
        im2=Image.open(p).convert('RGB').resize((cw,ch), Image.LANCZOS)
        x=(i%cols)*cw; y=(i//cols)*ch
        im.paste(im2,(x,y)); d.rectangle([x,y,x+280,y+20], fill=(0,0,0)); d.text((x+5,y+4), n, fill=(255,255,0))
    im.save(out, quality=90); print(out, im.size)
sheet(['f-w-living-s','f-w-living-w','f-w-kitchen','f-w-bedroom-w','f-w-bedroom-n','f-w-study'], 'qa/visual/r-wins.jpg', 3, 480, 300)
sheet(['f-d-bed','f-d-kitchen-counter','f-d-tv','f-d-desk','f-held-front','f-placed-front'], 'qa/visual/r-details.jpg', 3, 480, 300)
