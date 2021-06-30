import sys,pathlib,logging
if not "../../haplotyping" in sys.path: sys.path.insert(0, "../../haplotyping")
import haplotyping.service

logging.basicConfig(format="%(asctime)s | %(name)s |  %(levelname)s: %(message)s", datefmt="%m-%d-%y %H:%M:%S")

logging.getLogger("haplotyping.service.api.server").setLevel(logging.DEBUG)
logging.getLogger("haplotyping.service.api").setLevel(logging.DEBUG)

location = pathlib.Path().absolute()
haplotyping.service.API(location)
