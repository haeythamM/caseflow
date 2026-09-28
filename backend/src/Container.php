<?php
declare(strict_types=1);

namespace CaseFlow;

use CaseFlow\Http\HttpError;
use ReflectionClass;
use ReflectionNamedType;

/** Composition only: deliberately no default persistence implementation. */
final class Container
{
    private array $bindings;
    private array $instances = [];

    public function __construct(array $bindings = [])
    {
        $this->bindings = $bindings;
        $this->instances[self::class] = $this;
    }

    public function get(string $type): object
    {
        if (isset($this->instances[$type])) return $this->instances[$type];
        if (array_key_exists($type, $this->bindings)) {
            $binding = $this->bindings[$type];
            $instance = is_callable($binding) ? $binding($this) : $binding;
            if (!$instance instanceof $type) throw new \LogicException('Invalid binding for ' . $type);
            return $this->instances[$type] = $instance;
        }
        $class = new ReflectionClass($type);
        if (!$class->isInstantiable()) {
            throw new HttpError(503, 'Data access is not configured yet. Connect your database repositories when you are ready.', ['dataAccess' => 'not_configured']);
        }
        $arguments = [];
        foreach ($class->getConstructor() ? $class->getConstructor()->getParameters() : [] as $parameter) {
            $dependency = $parameter->getType();
            if (!$dependency instanceof ReflectionNamedType || $dependency->isBuiltin()) throw new \LogicException('Constructor dependencies must have class or interface types.');
            $arguments[] = $this->get($dependency->getName());
        }
        return $this->instances[$type] = $class->newInstanceArgs($arguments);
    }
}
