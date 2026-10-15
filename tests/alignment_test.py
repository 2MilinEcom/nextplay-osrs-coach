import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('alignment',pathlib.Path(__file__).parents[1]/'integrations/obs/align_events.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AlignmentTest(unittest.TestCase):
    def test_alignment_filters_outside_clip_and_preserves_source(self):
        data={'events':[{'t':5,'kind':'note'},{'t':12,'kind':'note'},{'t':25,'kind':'death'}],'outcome':'loss'}
        result=m.align(data,10,10)
        self.assertEqual(result['events'],[{'t':2,'kind':'note'}])
        self.assertEqual(result['outcome'],'unknown')
        self.assertEqual(data['events'][1]['t'],12)
if __name__=='__main__':unittest.main()
