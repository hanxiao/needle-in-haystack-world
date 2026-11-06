from PIL import Image
import glob, os, json
def stats(p):
    im=Image.open(p).convert('RGB')
    im2=im.resize((360,225), Image.LANCZOS)
    px=list(im2.getdata())
    lum=sorted(int(0.2126*r+0.7152*g+0.0722*b) for r,g,b in px)
    n=len(lum)
    q=lambda f: lum[min(n-1,int(f*(n-1)))]
    return dict(w=im.size[0],h=im.size[1],mean=round(sum(lum)/n,1),p1=q(0.01),p5=q(0.05),p50=q(0.5),p95=q(0.95),p99=q(0.99),
                clipHi=round(100*sum(1 for v in lum if v>=250)/n,2), clipLo=round(100*sum(1 for v in lum if v<=6)/n,2))
out={}
for p in sorted(glob.glob('qa/visual/shots/r1-*.png')):
    out[os.path.basename(p)[3:-4]]=stats(p)
print(json.dumps(out,indent=0))
