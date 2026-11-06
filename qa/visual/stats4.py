from PIL import Image
import glob, os, json
import numpy as np
def stats(p, box=None):
    im=Image.open(p).convert('RGB')
    if box: im=im.crop(box)
    im=im.resize((360,225), Image.LANCZOS)
    px=list(im.getdata())
    lum=sorted(int(0.2126*r+0.7152*g+0.0722*b) for r,g,b in px)
    n=len(lum); q=lambda f: lum[min(n-1,int(f*(n-1)))]
    return dict(mean=round(sum(lum)/n,1),p1=q(0.01),p50=q(0.5),p99=q(0.99),clipHi=round(100*sum(1 for v in lum if v>=250)/n,2),clipLo=round(100*sum(1 for v in lum if v<=6)/n,2))
out={}
for p in sorted(glob.glob('qa/visual/shots/s-*.png')):
    out[os.path.basename(p)[2:-4]]=stats(p)
out['WIN_DAY']=stats('qa/visual/shots/s-win-day.png',(210,200,950,540))
out['WIN_NIGHT']=stats('qa/visual/shots/s-night-win.png',(210,200,950,540))
print(json.dumps(out))
