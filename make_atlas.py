# Make a texture atlas.
#

from PIL import Image, ImageDraw

IMAGES = ['dalek.png', 'hal-9000.png', 'mr_squiggle.png', 'tardis.png']

imgs = []
for img in IMAGES:
    imgs.append(Image.open(img))
    # with Image.open(img) as im:
    #     print(f'{img} {im.size}')
    #     imgs.append(im)

print(imgs)

atlas = Image.new('RGBA', (256*len(imgs), 256), '#0000')
print(atlas)
draw = ImageDraw.Draw(atlas)
for i,im in enumerate(imgs):
    print(i, im)
    atlas.paste(im, (i*256, 0))

atlas.save('_atlas.png')