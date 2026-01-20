"""
RAW image converter using LibRaw
"""
import subprocess
import os

def convert_raw(raw_path: str, extract_preview: bool = False, output_size: int = None) -> str:
    """
    Convert RAW image to JPEG
    
    Args:
        raw_path: Path to RAW file
        extract_preview: If True, extract embedded JPEG preview
        output_size: Maximum dimension for output (optional)
    
    Returns:
        Path to converted JPEG file
    """
    output_path = f'/tmp/{os.path.basename(raw_path)}.jpg'
    
    if extract_preview:
        # Use dcraw to extract embedded preview (fast)
        subprocess.run(['dcraw', '-e', '-c', raw_path], stdout=open(output_path, 'wb'))
    else:
        # Full conversion with resize if needed
        cmd = ['dcraw', '-w', '-c', raw_path]
        if output_size:
            cmd.extend(['-o', '1', '-h', '-q', '3'])  # High quality
        
        subprocess.run(cmd, stdout=open(output_path, 'wb'))
        
        # Resize if needed (using ImageMagick)
        if output_size:
            subprocess.run([
                'convert', output_path,
                '-resize', f'{output_size}x{output_size}>',
                output_path
            ])
    
    return output_path
