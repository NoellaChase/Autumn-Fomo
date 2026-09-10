#!/usr/bin/env python3
"""
Generate personalized Autumn FOMO certificates with customer names
"""

from PIL import Image, ImageDraw, ImageFont
import sys
import os

def generate_certificate(customer_name, output_path=None):
    """
    Generate a personalized certificate with the customer's name
    
    Args:
        customer_name: Name to add to the certificate
        output_path: Where to save the certificate (optional)
    """
    # Load the template
    template_path = "/root/.openclaw/workspace/autumn-fomo/certificate/autumn-certificate-template.jpg"
    img = Image.open(template_path)
    
    # Create a drawing context
    draw = ImageDraw.Draw(img)
    
    # Try to load a nice font, fall back to default if not available
    try:
        # Try a few common elegant fonts
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, 60)  # Adjust size as needed
                break
        
        if font is None:
            font = ImageFont.load_default()
    except Exception as e:
        print(f"Warning: Could not load custom font: {e}")
        font = ImageFont.load_default()
    
    # Calculate text position (centered on the "Your Name" line)
    # Based on the image, the name line appears to be around:
    # - Horizontally centered
    # - Vertically at about 40% from the top
    
    img_width, img_height = img.size
    
    # Get text bounding box to center it
    bbox = draw.textbbox((0, 0), customer_name, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Position the text
    # For the new template, the name line is approximately at 42% from top
    # Adjusted down by approximately 0.5 character height
    x = (img_width - text_width) // 2
    y = int(img_height * 0.42) - (text_height // 2) + int(text_height * 0.5)  # Moved down by half character height
    
    # Draw the text in a brown/autumn color
    text_color = (101, 67, 33)  # Dark brown color that matches autumn theme
    draw.text((x, y), customer_name, font=font, fill=text_color)
    
    # Save the personalized certificate
    if output_path is None:
        # Generate output path based on customer name
        safe_name = "".join(c if c.isalnum() else "_" for c in customer_name)
        output_path = f"/root/.openclaw/workspace/autumn-fomo/certificate/certificate_{safe_name}.jpg"
    
    img.save(output_path, quality=95)
    print(f"Certificate generated: {output_path}")
    return output_path

def main():
    if len(sys.argv) < 2:
        print("Usage: generate_personalized_certificate.py <customer_name> [output_path]")
        sys.exit(1)
    
    customer_name = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    generate_certificate(customer_name, output_path)

if __name__ == "__main__":
    main()
