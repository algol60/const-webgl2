# Make a texture atlas.
#

from PIL import Image, ImageDraw

# Update graph-util.js when changing these.
#
IMAGES = ['dalek', 'hal-9000', 'mr_squiggle', 'tardis', 'australia', 'china', 'russia', 'ukraine', 'check']
IMAGES_BG = ['flat_circle', 'flat_square', 'round_circle', 'round_square', 'transparent']

def open_images(image_names):
    imgs = []
    for img in image_names:
        imgs.append(Image.open(img + '.png'))
        # with Image.open(img) as im:
        #     print(f'{img} {im.size}')
        #     imgs.append(im)

    return imgs

def atlas_linear(image_names):
    imgs = open_images(image_names)
    atlas = Image.new('RGBA', (256*len(imgs), 256), '#0000')
    print(atlas)
    # draw = ImageDraw.Draw(atlas)
    for i,im in enumerate(imgs):
        x,y = i*256, 0
        atlas.paste(im, (x, y))
        print(f'{i:2} {im} {x:3} {y:3}')

    return atlas

def atlas_8x8(image_names):
    imgs = open_images(image_names)
    size = 256*8
    atlas = Image.new('RGBA', (size, size), '#0000')
    print(atlas)
    # draw = ImageDraw.Draw(atlas)
    for i,im in enumerate(imgs):
        x, y = (i*256)%size, (i*256)//size * 256
        atlas.paste(im, (x, y))
        print(f'{i:2} {im} {x:3} {y:3}')

    return atlas

# atlas = atlas_linear(IMAGES)
atlas = atlas_8x8(IMAGES + IMAGES_BG)
atlas.save('_atlas.png')
