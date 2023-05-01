import sys,pathlib,logging
import haplotyping.service

logging.basicConfig(format="%(asctime)s | %(name)s |  %(levelname)s: %(message)s", datefmt="%m-%d-%y %H:%M:%S")

logging.getLogger("haplotyping.service.api.server").setLevel(logging.DEBUG)
logging.getLogger("haplotyping.service.api").setLevel(logging.DEBUG)

location = pathlib.Path().absolute()
haplotyping.service.API(location)
