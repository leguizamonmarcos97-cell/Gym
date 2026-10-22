import sys, glob
from PIL import Image, ImageDraw, ImageFont
f=lambda s: ImageFont.truetype(glob.glob('/usr/share/fonts/**/DejaVuSans-Bold.ttf',recursive=True)[0],s)
pre,titulo,sub,t1,t2,salida=sys.argv[1:7]
a=Image.open(pre+'0.png');b=Image.open(pre+'1.png'); w,h=a.size
S=Image.new('RGB',(w*2,h+170),(10,11,14));d=ImageDraw.Draw(S)
S.paste(a,(0,170));S.paste(b,(w,170))
d.text((40,30),titulo,fill='white',font=f(64)); d.text((40,110),sub,fill=(255,120,100),font=f(34))
for x,t in ((40,t1),(w+40,t2)):
    tw=d.textlength(t,font=f(34)); d.rounded_rectangle((x-12,h+170-80,x+tw+12,h+170-20),12,fill=(0,0,0)); d.text((x,h+170-72),t,fill='white',font=f(34))
S.save(salida,quality=90)
