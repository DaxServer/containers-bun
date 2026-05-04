import containers.bun.version


def test_version():
    """Test pretty much nothing other than that the test executes."""
    assert containers.bun.version.__version__ is not None
