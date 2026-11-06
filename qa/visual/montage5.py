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
        im.paste(im2,(x,y)); d.rectangle([x,y,x+290,y+20], fill=(0,0,0)); d.text((x+5,y+4), n, fill=(255,255,0))
    im.save(out, quality=90); print(out, im.size)
sheet(['v-spawn-default','v-night-spawn','v-night-win','v-win-day'], 'qa/visual/v-night.jpg', 2)
sheet(['v-bed-fp-a','v-bed-fp-b','v-bed-tp','v-night-bed'], 'qa/visual/v-bed.jpg', 2)
sheet(['v-clip-bed','v-clip-study','v-clip-bath','v-clip-hall'], 'qa/visual/v-clip.jpg', 2)
sheet(['v-living-fp-a','v-kitchen-fp-b','v-wide-spawn','v-mobile-dpr1'], 'qa/visual/v-sanity.jpg', 2, 480, 300)
im=Image.open('qa/visual/shots/v-spawn-default.png').convert('RGB')
im.crop((1236,8,1436,208)).save('qa/visual/shots/v-hud-map.png')
im.crop((0,0,460,120)).save('qa/visual/shots/v-hud-top.png')
im.crop((0,580,392,900)).save('qa/visual/shots/v-hud-panels.png')
m=Image.open('qa/visual/shots/v-mobile-dpr2.png').convert('RGB')
m.crop((0,1150,780,1688)).save('qa/visual/shots/v-mobile-hud.png')
m.crop((0,0,780,200)).save('qa/visual/shots/v-mobile-top.png')
print('crops ok')
