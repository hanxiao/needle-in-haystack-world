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
            d.rectangle([x,y,x+260,y+20], fill=(0,0,0))
            d.text((x+5,y+4), n, fill=(255,255,0))
    im.save(out, quality=90)
    print(out, im.size)
sheet(['r1-liv-sofa','r1-liv-window','r1-kit-counter','r1-kit-dining'], 'qa/visual/sheet-rooms-a.jpg', 2)
sheet(['r1-bed-bed','r1-bed-corner','r1-hall-front','r1-hall-back'], 'qa/visual/sheet-rooms-b.jpg', 2)
sheet(['r1-bath-tub','r1-bath-vanity','r1-stu-desk','r1-stu-shelves'], 'qa/visual/sheet-rooms-c.jpg', 2)
sheet(['r1-liv-fp','r1-kit-fp','r1-bed-fp','r1-hall-fp','r1-bath-fp','r1-stu-fp'], 'qa/visual/sheet-fp.jpg', 3, 480, 300)
sheet(['r1-door-hall-bed','r1-door-hall-bath','r1-door-kit-study','r1-door-living-hall'], 'qa/visual/sheet-doors.jpg', 2)
sheet(['r1-fp-spawn','r1-held-mug','r1-placed-mug','r1-needle-near'], 'qa/visual/sheet-states.jpg', 2)
sheet(['r1-night-spawn','r1-night-kitchen','r1-spawn-default','r1-wide-spawn'], 'qa/visual/sheet-daynight.jpg', 2)
sheet(['r1-mobile-spawn','r1-mobile-fp'], 'qa/visual/sheet-mobile.jpg', 2, 390, 844)
