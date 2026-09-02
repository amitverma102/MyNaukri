import sys
from PIL import Image

def main():
    img_path = sys.argv[1]
    im = Image.open(img_path).convert('RGB')
    
    # We want to find a non-black, non-white color. The teal color.
    # Let's sample a few pixels or just find the most common non-greyscale color.
    colors = im.getcolors(im.width * im.height)
    
    teal_colors = []
    for count, color in colors:
        r, g, b = color
        # filter out whites and blacks/greys
        if abs(r - g) > 20 or abs(g - b) > 20 or abs(r - b) > 20:
            if g > 150 and b > 150 and r < 100: # specific to teal/cyan (high G and B, low R)
                teal_colors.append((count, color))
                
    teal_colors.sort(reverse=True)
    if teal_colors:
        best_color = teal_colors[0][1]
        hex_color = "#{:02x}{:02x}{:02x}".format(*best_color)
        print(f"Teal Color: {hex_color}")
    else:
        print("Could not isolate teal color")

if __name__ == "__main__":
    main()
