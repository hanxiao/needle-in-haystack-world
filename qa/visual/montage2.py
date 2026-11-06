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
            d.rectangle([x,y,x+280,y+20], fill=(0,0,0))
            d.text((x+5,y+4), n, fill=(255,255,0))
    im.save(out, quality=90)
    print(out, im.size)
sheet(['f-liv-a-sofa','f-liv-b-window','f-kit-a-counter','f-kit-b-dining'], 'qa/visual/f-rooms-a.jpg', 2)
sheet(['f-bed-a-bed','f-bed-b-corner','f-hall-a-front','f-hall-b-back'], 'qa/visual/f-rooms-b.jpg', 2)
sheet(['f-bath-a-tub','f-bath-b-vanity','f-stu-a-desk','f-stu-b-shelves'], 'qa/visual/f-rooms-c.jpg', 2)
sheet(['f-liv-fp','f-kit-fp','f-bed-fp','f-hall-fp','f-bath-fp','f-stu-fp'], 'qa/visual/f-fp.jpg', 3, 480, 300)
sheet(['f-win-living','f-win-kitchen','f-win-bedroom','f-door-front'], 'qa/visual/f-windows.jpg', 2)
sheet(['f-door-hall-bed','f-door-hall-bath','f-door-kit-study','f-door-living-hall'], 'qa/visual/f-doors.jpg', 2)
sheet(['f-night-spawn','f-night-living','f-night-kitchen','f-night-bedroom'], 'qa/visual/f-night.jpg', 2)
sheet(['f-fp-spawn','f-held-mug','f-placed-mug','f-needle-near'], 'qa/visual/f-states.jpg', 2)
