FROM public.ecr.aws/lambda/python:3.11

# Install LibRaw and ImageMagick
RUN yum install -y libraw-devel ImageMagick ImageMagick-devel

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY handler.py .
COPY raw_converter.py .

CMD ["handler.lambda_handler"]
